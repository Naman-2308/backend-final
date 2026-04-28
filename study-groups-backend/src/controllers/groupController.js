const mongoose = require("mongoose");
const StudyGroup = require("../models/StudyGroup");
const User = require("../models/User");
const GroupGoal = require("../models/GroupGoal");
const GroupMemberActivity = require("../models/GroupMemberActivity");
const Question = require("../models/Question");
const Subject = require("../models/Subject");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const {
  parsePagination,
  parseSortOrder,
  parseMetric,
  parseTimeWindow,
  parseSubjectFilter
} = require("../utils/query");
const {
  normalizeSubjects,
  computeRecurringWindowEnd,
  getActiveGoalForGroup
} = require("../utils/goal");
const {
  buildLeaderboardCacheKey,
  buildProgressCacheKey,
  getCache,
  setCache,
  invalidateGroupCache
} = require("../utils/cache");

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const ensureGroupMemberAccess = async (groupId, userId) => {
  return StudyGroup.findOne({
    _id: groupId,
    members: userId
  });
};

const computeRankedRows = (rows, scoreField) => {
  let previousScore = null;
  let previousRank = 0;

  return rows.map((row, index) => {
    const score = row[scoreField];
    const rank = previousScore === score ? previousRank : index + 1;

    previousScore = score;
    previousRank = rank;

    return {
      ...row,
      rank
    };
  });
};

const resolveQuestionSubject = async (question) => {
  if (question.subject) {
    return String(question.subject).trim().toLowerCase();
  }

  if (question.subjectId) {
    const subject = await Subject.findById(question.subjectId).select("slug name").lean();

    if (subject) {
      return String(subject.slug || subject.name).trim().toLowerCase();
    }
  }

  return null;
};

const syncGroupActiveGoal = async (group, activeGoalId) => {
  if (String(group.activeGoal || "") !== String(activeGoalId || "")) {
    group.activeGoal = activeGoalId;
    await group.save();
  }
};

const resolveUsersByEmails = async (emails) => {
  const userIds = [];

  for (const email of emails) {
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        googleId: email,
        email,
        name: email.split("@")[0]
      });
    }

    userIds.push(user._id);
  }

  return userIds;
};

const getTimeWindowStart = (goal, timeWindow) => {
  if (timeWindow === "all") {
    return goal.windowStart;
  }

  const now = new Date();
  const durationInDays = timeWindow === "daily" ? 1 : 7;
  const calculatedStart = new Date(now.getTime() - durationInDays * 24 * 60 * 60 * 1000);

  return calculatedStart > goal.windowStart ? calculatedStart : goal.windowStart;
};

const getGoalCacheTtlSeconds = (goal) => {
  if (!goal?.windowEnd) {
    return 300;
  }

  const ttl = Math.ceil((new Date(goal.windowEnd).getTime() - Date.now()) / 1000);
  return ttl > 0 ? ttl : 60;
};

const formatGoalPayload = (goal) => ({
  goalId: goal._id,
  title: goal.title,
  subjects: goal.subjects,
  metric: goal.metric,
  totalTarget: goal.totalTarget,
  deadline: goal.deadline,
  recurringFrequency: goal.recurringFrequency,
  windowStart: goal.windowStart,
  windowEnd: goal.windowEnd,
  isActive: goal.status === "active",
  status: goal.status
});

const createGroup = async (req, res) => {
  try {
    const { name, description = "", memberEmails = [], members: requestedMembers = [] } = req.body;
    const creatorId = req.user.userId;
    const creatorEmail = req.user.email;

    if (!name || !name.trim()) {
      return sendError(res, 400, "Group name is required", "GROUP_NAME_REQUIRED");
    }

    const existingGroup = await StudyGroup.findOne({ creator: creatorId });

    if (existingGroup) {
      return sendError(
        res,
        409,
        "A creator can only create one group",
        "GROUP_CREATOR_LIMIT_REACHED"
      );
    }

    const initialMembers =
      Array.isArray(memberEmails) && memberEmails.length > 0 ? memberEmails : requestedMembers;
    const uniqueEmails = [...new Set([...initialMembers, creatorEmail])]
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const memberIds = await resolveUsersByEmails(uniqueEmails);

    const group = await StudyGroup.create({
      name: name.trim(),
      description: description.trim(),
      creator: creatorId,
      members: memberIds
    });

    const members = await User.find({ _id: { $in: memberIds } }).select("email").lean();

    return sendSuccess(res, 201, "Study group created successfully", {
      groupId: group._id,
      name: group.name,
      creator: creatorEmail,
      members: members.map((member) => member.email).sort(),
      activeGoal: group.activeGoal,
      createdAt: group.createdAt
    });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "A creator can only create one group",
        "GROUP_CREATOR_LIMIT_REACHED"
      );
    }

    return sendError(
      res,
      500,
      "Failed to create study group",
      "GROUP_CREATE_FAILED",
      error.message
    );
  }
};

const addMember = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { email } = req.body;

    if (!isValidObjectId(groupId)) {
      return sendError(res, 400, "Invalid group id", "INVALID_GROUP_ID");
    }

    if (!email || !email.trim()) {
      return sendError(res, 400, "Member email is required", "MEMBER_EMAIL_REQUIRED");
    }

    const group = await StudyGroup.findById(groupId);

    if (!group) {
      return sendError(res, 404, "Study group not found", "GROUP_NOT_FOUND");
    }

    if (String(group.creator) !== req.user.userId) {
      return sendError(
        res,
        403,
        "Only the group creator can add members",
        "GROUP_MEMBER_ADD_FORBIDDEN"
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [memberId] = await resolveUsersByEmails([normalizedEmail]);

    if (group.members.some((member) => String(member) === String(memberId))) {
      return sendError(
        res,
        409,
        "User is already a member of this group",
        "USER_ALREADY_MEMBER",
        `The email ${normalizedEmail} is already part of this group.`
      );
    }

    group.members.push(memberId);
    await group.save();

    const members = await User.find({ _id: { $in: group.members } }).select("email").lean();

    return sendSuccess(res, 200, "Member added successfully", {
      groupId: group._id,
      members: members.map((member) => member.email).sort()
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to add group member",
      "GROUP_MEMBER_ADD_FAILED",
      error.message
    );
  }
};

const createGoal = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const {
      title,
      subject,
      subjects,
      totalTarget,
      metric,
      deadline,
      recurringFrequency,
      windowStart
    } =
      req.body;

    if (!isValidObjectId(groupId)) {
      return sendError(res, 400, "Invalid group id", "INVALID_GROUP_ID");
    }

    const group = await StudyGroup.findById(groupId);

    if (!group) {
      return sendError(res, 404, "Study group not found", "GROUP_NOT_FOUND");
    }

    if (String(group.creator) !== req.user.userId) {
      return sendError(
        res,
        403,
        "Only the group creator can create goals",
        "GROUP_GOAL_FORBIDDEN"
      );
    }

    const normalizedSubjects = normalizeSubjects(subjects || (subject ? [subject] : []));

    const parsedTotalTarget = Number(totalTarget);

    if (
      !title ||
      !title.trim() ||
      normalizedSubjects.length === 0 ||
      Number.isNaN(parsedTotalTarget) ||
      parsedTotalTarget <= 0
    ) {
      return sendError(
        res,
        400,
        "Title, subjects, and totalTarget are required",
        "GOAL_VALIDATION_ERROR"
      );
    }

    const activeGoal = await getActiveGoalForGroup(groupId);

    if (activeGoal) {
      return sendError(
        res,
        409,
        "Only one active goal is allowed per group",
        "ACTIVE_GOAL_ALREADY_EXISTS"
      );
    }

    const goalType = deadline ? "deadline" : "recurring";
    const startDate = windowStart ? new Date(windowStart) : new Date();

    if (Number.isNaN(startDate.getTime())) {
      return sendError(res, 400, "Invalid windowStart", "INVALID_WINDOW_START");
    }

    let endDate;

    if (goalType === "deadline") {
      endDate = new Date(deadline);

      if (Number.isNaN(endDate.getTime())) {
        return sendError(res, 400, "Invalid deadline", "INVALID_DEADLINE");
      }
    } else {
      if (!recurringFrequency) {
        return sendError(
          res,
          400,
          "Recurring goals require recurringFrequency",
          "RECURRING_FREQUENCY_REQUIRED"
        );
      }

      endDate = computeRecurringWindowEnd(startDate, recurringFrequency);
    }

    if (endDate <= startDate) {
      return sendError(
        res,
        400,
        "Goal end date must be after start date",
        "INVALID_GOAL_WINDOW"
      );
    }

    if (metric && metric !== "questionsSolved") {
      return sendError(
        res,
        400,
        "Only questionsSolved metric is supported",
        "INVALID_GOAL_METRIC"
      );
    }

    const goal = await GroupGoal.create({
      groupId,
      title: title.trim(),
      subjects: normalizedSubjects,
      metric: "questionsSolved",
      totalTarget: parsedTotalTarget,
      goalType,
      deadline: goalType === "deadline" ? endDate : null,
      recurringFrequency: goalType === "recurring" ? recurringFrequency : null,
      windowStart: startDate,
      windowEnd: endDate
    });

    group.activeGoal = goal._id;
    await group.save();

    await invalidateGroupCache(groupId);

    return sendSuccess(res, 201, "Group goal created successfully", {
      ...formatGoalPayload(goal)
    });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "Only one active goal is allowed per group",
        "ACTIVE_GOAL_ALREADY_EXISTS"
      );
    }

    return sendError(
      res,
      500,
      "Failed to create group goal",
      "GOAL_CREATE_FAILED",
      error.message
    );
  }
};

const updateGoal = async (req, res) => {
  try {
    const { id: groupId, goalId } = req.params;
    const { title, subject, subjects, totalTarget, deadline, recurringFrequency, windowStart } =
      req.body;

    if (!isValidObjectId(groupId) || !isValidObjectId(goalId)) {
      return sendError(res, 400, "Invalid group or goal id", "INVALID_GOAL_REFERENCE");
    }

    const group = await StudyGroup.findById(groupId);

    if (!group) {
      return sendError(res, 404, "Study group not found", "GROUP_NOT_FOUND");
    }

    if (String(group.creator) !== req.user.userId) {
      return sendError(
        res,
        403,
        "Only the group creator can edit goals",
        "GROUP_GOAL_EDIT_FORBIDDEN"
      );
    }

    const goal = await GroupGoal.findOne({ _id: goalId, groupId });

    if (!goal) {
      return sendError(res, 404, "Group goal not found", "GOAL_NOT_FOUND");
    }

    if (goal.status !== "active") {
      return sendError(
        res,
        409,
        "Only active goals can be edited",
        "GOAL_EDIT_NOT_ALLOWED"
      );
    }

    if (title) {
      goal.title = title.trim();
    }

    if (subjects || subject) {
      const normalizedSubjects = normalizeSubjects(subjects || [subject]);

      if (normalizedSubjects.length === 0) {
        return sendError(
          res,
          400,
          "At least one subject is required",
          "GOAL_VALIDATION_ERROR"
        );
      }

      goal.subjects = normalizedSubjects;
    }

    if (totalTarget !== undefined) {
      const parsedTotalTarget = Number(totalTarget);

      if (Number.isNaN(parsedTotalTarget) || parsedTotalTarget <= 0) {
        return sendError(
          res,
          400,
          "totalTarget must be a positive number",
          "GOAL_VALIDATION_ERROR"
        );
      }

      goal.totalTarget = parsedTotalTarget;
    }

    if (windowStart) {
      const startDate = new Date(windowStart);
    
      if (Number.isNaN(startDate.getTime())) {
        return sendError(res, 400, "Invalid windowStart", "INVALID_WINDOW_START");
      }
    
      goal.windowStart = startDate;
    
      if (goal.goalType === "recurring" && goal.recurringFrequency) {
        goal.windowEnd = computeRecurringWindowEnd(startDate, goal.recurringFrequency);
      }
    }

    if (deadline) {
      const endDate = new Date(deadline);

      if (Number.isNaN(endDate.getTime())) {
        return sendError(res, 400, "Invalid deadline", "INVALID_DEADLINE");
      }

      goal.goalType = "deadline";
      goal.deadline = endDate;
      goal.windowEnd = endDate;
      goal.recurringFrequency = null;
    } else if (recurringFrequency) {
      goal.goalType = "recurring";
      goal.recurringFrequency = recurringFrequency;
      goal.deadline = null;
      goal.windowEnd = computeRecurringWindowEnd(goal.windowStart, recurringFrequency);
    }

    if (goal.windowEnd <= goal.windowStart) {
      return sendError(
        res,
        400,
        "Goal end date must be after start date",
        "INVALID_GOAL_WINDOW"
      );
    }

    await goal.save();
    await invalidateGroupCache(groupId);

    return sendSuccess(res, 200, "Group goal updated successfully", {
      ...formatGoalPayload(goal)
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to update group goal",
      "GOAL_UPDATE_FAILED",
      error.message
    );
  }
};

const recordActivity = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { questionId, subject, status, timeSpent = 0, timestamp } = req.body;
    const userId = req.user.userId;
    const normalizedTimeSpent = Number(timeSpent);

    if (!isValidObjectId(groupId) || !isValidObjectId(questionId)) {
      return sendError(res, 400, "Invalid group or question id", "INVALID_ACTIVITY_REFERENCE");
    }

    const group = await ensureGroupMemberAccess(groupId, userId);

    if (!group) {
      return sendError(
        res,
        403,
        "Only group members can record activity",
        "GROUP_ACTIVITY_FORBIDDEN"
      );
    }

    const activeGoal = await getActiveGoalForGroup(groupId);

    if (!activeGoal) {
      return sendError(res, 404, "No active goal found for group", "ACTIVE_GOAL_NOT_FOUND");
    }

    if (Number.isNaN(normalizedTimeSpent) || normalizedTimeSpent < 0) {
      return sendError(
        res,
        400,
        "timeSpent must be a non-negative number",
        "INVALID_TIME_SPENT"
      );
    }

    await syncGroupActiveGoal(group, activeGoal._id);

    if (!["solved", "correct"].includes(status)) {
      return sendError(
        res,
        400,
        'Only "solved" or "correct" activities count toward goals',
        "INVALID_ACTIVITY_STATUS"
      );
    }

    const providedSubject = String(subject || "").trim().toLowerCase();

    if (!providedSubject) {
      return sendError(
        res,
        400,
        "Activity subject is required",
        "ACTIVITY_SUBJECT_REQUIRED"
      );
    }

    if (!activeGoal.subjects.includes(providedSubject)) {
      return sendError(
        res,
        400,
        "Activity subject does not match the active goal",
        "GOAL_SUBJECT_MISMATCH"
      );
    }

    const question = await Question.findById(questionId).select("subject subjectId");

    if (!question) {
      return sendError(res, 404, "Question not found", "QUESTION_NOT_FOUND");
    }

    const questionSubject = await resolveQuestionSubject(question);

    if (!questionSubject) {
      return sendError(
        res,
        400,
        "Question is missing a usable subject value",
        "QUESTION_SUBJECT_MISSING"
      );
    }

    if (providedSubject && providedSubject !== questionSubject) {
      return sendError(
        res,
        400,
        "Activity subject must match question subject",
        "QUESTION_SUBJECT_MISMATCH"
      );
    }

    const activityTime = timestamp ? new Date(timestamp) : new Date();

    if (Number.isNaN(activityTime.getTime())) {
      return sendError(res, 400, "Invalid activity timestamp", "INVALID_ACTIVITY_TIMESTAMP");
    }

    if (activityTime < activeGoal.windowStart || activityTime > activeGoal.windowEnd) {
      return sendError(
        res,
        400,
        "Activity timestamp must be within the active goal window",
        "ACTIVITY_OUTSIDE_GOAL_WINDOW"
      );
    }

    let activity;

    try {
      activity = await GroupMemberActivity.create({
        userId,
        groupId,
        goalId: activeGoal._id,
        questionId,
        subject: questionSubject,
        status: "solved",
        timeSpent: normalizedTimeSpent,
        timestamp: activityTime
      });
    } catch (error) {
      if (error.code === 11000) {
        return sendError(
          res,
          409,
          "The same user can only solve the same question once per goal",
          "DUPLICATE_QUESTION_SOLVE"
        );
      }

      throw error;
    }

    await invalidateGroupCache(groupId);

    const user = await User.findById(userId).select("email").lean();

    return sendSuccess(res, 201, "Activity recorded successfully", {
      activityId: activity._id,
      user: user ? user.email : req.user.email,
      questionId: activity.questionId,
      status: activity.status,
      timeSpent: activity.timeSpent,
      timestamp: activity.timestamp
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to record activity",
      "ACTIVITY_CREATE_FAILED",
      error.message
    );
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const metric = parseMetric(req.query.metric);
    const timeWindow = parseTimeWindow(req.query.timeWindow);
    const subjectFilter = parseSubjectFilter(req.query.subject);
    const { sort = "desc" } = req.query;
    const { limit, offset } = parsePagination(req.query);

    if (!isValidObjectId(groupId)) {
      return sendError(res, 400, "Invalid group id", "INVALID_GROUP_ID");
    }

    if (!["solved", "percentage", "timeSpent"].includes(metric)) {
      return sendError(res, 400, "Invalid leaderboard metric", "INVALID_LEADERBOARD_METRIC");
    }

    const group = await ensureGroupMemberAccess(groupId, req.user.userId);

    if (!group) {
      return sendError(
        res,
        403,
        "Only group members can view the leaderboard",
        "GROUP_LEADERBOARD_FORBIDDEN"
      );
    }

    const activeGoal = await getActiveGoalForGroup(groupId);

    if (!activeGoal) {
      return sendError(res, 404, "No active goal found for group", "ACTIVE_GOAL_NOT_FOUND");
    }

    const normalizedSort = sort === "asc" ? "asc" : "desc";
    const appliedSubjects =
      subjectFilter.length > 0
        ? subjectFilter.filter((s) => activeGoal.subjects.includes(s))
        : [];

    const cacheKey = buildLeaderboardCacheKey(groupId, {
      metric,
      sort: normalizedSort,
      timeWindow,
      subjects: appliedSubjects,
      limit,
      offset
    });
    const cached = await getCache(cacheKey);

    if (cached) {
      return sendSuccess(res, 200, "Leaderboard fetched successfully", cached);
    }

    await syncGroupActiveGoal(group, activeGoal._id);

    const sortDirection = parseSortOrder(normalizedSort);
    const totalTarget = activeGoal.totalTarget;
    const timeWindowStart = getTimeWindowStart(activeGoal, timeWindow);
    const groupObjectId = toObjectId(groupId);
    const goalObjectId = toObjectId(activeGoal._id);
    const scoreFieldMap = {
      solved: "solvedCount",
      percentage: "percentage",
      timeSpent: "timeSpent"
    };
    const scoreField = scoreFieldMap[metric];

    const leaderboardRows = await StudyGroup.aggregate([
      {
        $match: {
          _id: groupObjectId
        }
      },
      {
        $project: {
          members: 1
        }
      },
      {
        $unwind: "$members"
      },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "member"
        }
      },
      {
        $unwind: "$member"
      },
      {
        $lookup: {
          from: "groupmemberactivities",
          let: {
            memberId: "$member._id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$groupId", groupObjectId] },
                    { $eq: ["$goalId", goalObjectId] },
                    { $eq: ["$userId", "$$memberId"] },
                    { $gte: ["$timestamp", timeWindowStart] },
                    { $lte: ["$timestamp", activeGoal.windowEnd] }
                  ]
                }
              }
            },
            ...(appliedSubjects.length > 0
              ? [
                  {
                    $match: {
                      subject: { $in: appliedSubjects }
                    }
                  }
                ]
              : []),
            {
              $group: {
                _id: "$userId",
                solvedCount: { $sum: 1 },
                timeSpent: { $sum: "$timeSpent" }
              }
            }
          ],
          as: "activityStats"
        }
      },
      {
        $addFields: {
          activityStats: {
            $ifNull: [
              {
                $arrayElemAt: ["$activityStats", 0]
              },
              {
                solvedCount: 0,
                timeSpent: 0
              }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          userId: "$member._id",
          name: "$member.name",
          email: "$member.email",
          solvedCount: "$activityStats.solvedCount",
          timeSpent: "$activityStats.timeSpent",
          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [
                      { $eq: [totalTarget, 0] },
                      0,
                      {
                        $divide: ["$activityStats.solvedCount", totalTarget]
                      }
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      {
        $sort: {
          [scoreField]: sortDirection,
          name: 1,
          userId: 1
        }
      }
    ]);

    const rankedRows = computeRankedRows(leaderboardRows, scoreField);
    const paginatedRows = rankedRows.slice(offset, offset + limit);
    const currentUserEntry = rankedRows.find(
      (row) => String(row.userId) === req.user.userId
    ) || null;

    const responseData = {
      goalId: activeGoal._id,
      totalMembers: rankedRows.length,
      title: activeGoal.title,
      subjects: activeGoal.subjects,
      metric,
      sort: normalizedSort,
      timeWindow,
      subject: appliedSubjects,
      leaderboard: paginatedRows.map((row) => ({
        userId: row.userId,
        user: row.email,
        name: row.name,
        solved: row.solvedCount,
        percentage: row.percentage,
        timeSpent: row.timeSpent,
        rank: row.rank
      })),
      currentUser: currentUserEntry
        ? {
            userId: currentUserEntry.userId,
            user: currentUserEntry.email,
            rank: currentUserEntry.rank,
            solved: currentUserEntry.solvedCount,
            percentage: currentUserEntry.percentage,
            timeSpent: currentUserEntry.timeSpent
          }
        : null,
      offset,
      limit
    };

    await setCache(cacheKey, responseData, getGoalCacheTtlSeconds(activeGoal));

    return sendSuccess(res, 200, "Leaderboard fetched successfully", responseData);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to fetch leaderboard",
      "LEADERBOARD_FETCH_FAILED",
      error.message
    );
  }
};

const getProgress = async (req, res) => {
  try {
    const { id: groupId } = req.params;

    if (!isValidObjectId(groupId)) {
      return sendError(res, 400, "Invalid group id", "INVALID_GROUP_ID");
    }

    const group = await ensureGroupMemberAccess(groupId, req.user.userId);

    if (!group) {
      return sendError(
        res,
        403,
        "Only group members can view progress",
        "GROUP_PROGRESS_FORBIDDEN"
      );
    }

    const activeGoal = await getActiveGoalForGroup(groupId);

    if (!activeGoal) {
      return sendError(res, 404, "No active goal found for group", "ACTIVE_GOAL_NOT_FOUND");
    }

    const cacheKey = buildProgressCacheKey(groupId, activeGoal._id);
    const cached = await getCache(cacheKey);

    if (cached) {
      return sendSuccess(res, 200, "Progress fetched successfully", cached);
    }

    await syncGroupActiveGoal(group, activeGoal._id);

    const progressRows = await StudyGroup.aggregate([
      {
        $match: {
          _id: toObjectId(groupId)
        }
      },
      {
        $project: {
          members: 1
        }
      },
      {
        $unwind: "$members"
      },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $lookup: {
          from: "groupmemberactivities",
          let: {
            memberId: "$user._id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$groupId", toObjectId(groupId)] },
                    { $eq: ["$goalId", toObjectId(activeGoal._id)] },
                    { $eq: ["$userId", "$$memberId"] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: "$userId",
                solvedCount: { $sum: 1 },
                timeSpent: { $sum: "$timeSpent" }
              }
            }
          ],
          as: "activityStats"
        }
      },
      {
        $addFields: {
          activityStats: {
            $ifNull: [
              {
                $arrayElemAt: ["$activityStats", 0]
              },
              {
                solvedCount: 0,
                timeSpent: 0
              }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
          solvedCount: "$activityStats.solvedCount",
          timeSpent: "$activityStats.timeSpent"
        }
      },
      {
        $sort: {
          solvedCount: -1,
          name: 1
        }
      }
    ]);

    const totalSolved = progressRows.reduce((sum, row) => sum + row.solvedCount, 0);
    const progressPercentage = Number(
      Math.min((totalSolved / activeGoal.totalTarget) * 100, 100).toFixed(2)
    );

    const responseData = {
      goalId: activeGoal._id,
      title: activeGoal.title,
      subjects: activeGoal.subjects,
      totalQuestions: activeGoal.totalTarget,
      questionsSolved: totalSolved,
      progressPercentage,
      perMemberProgress: progressRows.map((row) => ({
        userId: row.userId,
        user: row.email,
        solved: row.solvedCount,
        timeSpent: row.timeSpent,
        contributionPercentage:
          activeGoal.totalTarget > 0
            ? Number(((row.solvedCount / activeGoal.totalTarget) * 100).toFixed(2))
            : 0
      }))
    };

    await setCache(cacheKey, responseData, getGoalCacheTtlSeconds(activeGoal));

    return sendSuccess(res, 200, "Progress fetched successfully", responseData);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to fetch progress",
      "PROGRESS_FETCH_FAILED",
      error.message
    );
  }
};

module.exports = {
  createGroup,
  addMember,
  createGoal,
  updateGoal,
  recordActivity,
  getLeaderboard,
  getProgress
};
