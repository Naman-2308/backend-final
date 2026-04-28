const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parsePagination = (query) => {
  const limit = Math.min(parsePositiveInteger(query.limit, 10), 100);
  const offset = parsePositiveInteger(query.offset, 0);

  return { limit, offset };
};

const parseSortOrder = (value) => {
  return value === "asc" ? 1 : -1;
};

const parseMetric = (value) => {
  if (value === "questionsSolved") {
    return "solved";
  }

  return value || "solved";
};

const parseTimeWindow = (value) => {
  if (["daily", "weekly", "all"].includes(value)) {
    return value;
  }

  return "all";
};

const parseSubjectFilter = (value) => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : String(value).split(",");

  return [...new Set(values.map((entry) => entry.trim().toLowerCase()).filter(Boolean))];
};

module.exports = {
  parsePagination,
  parseSortOrder,
  parseMetric,
  parseTimeWindow,
  parseSubjectFilter
};
