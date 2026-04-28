const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const connectDB = require("../src/config/db");
const Subject = require("../src/models/Subject");
const Question = require("../src/models/Question");
const subjectSeed = require("../src/data/subjects.seed");
const questionSeed = require("../src/data/questions.seed");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const toSlug = (name) => name.trim().toLowerCase();

const seedSubjects = async () => {
  const operations = subjectSeed.map((subject) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(subject._id) },
      update: {
        $set: {
          name: subject.name,
          slug: toSlug(subject.name),
          description: subject.description,
          createdAt: new Date(subject.createdAt)
        }
      },
      upsert: true
    }
  }));

  await Subject.bulkWrite(operations);
};

const seedQuestions = async () => {
  const subjects = await Subject.find({}).select("_id name slug").lean();
  const subjectMap = new Map(subjects.map((subject) => [String(subject._id), subject]));

  const operations = questionSeed.map(
    ([text, subjectId, topic, difficulty, createdAt]) => {
      const subject = subjectMap.get(subjectId);

      if (!subject) {
        throw new Error(`Missing subject for question seed: ${text}`);
      }

      return {
        updateOne: {
          filter: { text },
          update: {
            $set: {
              text,
              subjectId: new mongoose.Types.ObjectId(subjectId),
              subject: subject.slug || toSlug(subject.name),
              topic,
              difficulty,
              createdAt: new Date(createdAt)
            }
          },
          upsert: true
        }
      };
    }
  );

  await Question.bulkWrite(operations);
};

const run = async () => {
  try {
    await connectDB();
    await seedSubjects();
    await seedQuestions();
    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
