function calculateRank(board, metric = "solved") {
    if (!Array.isArray(board)) return [];
  
    // Step 1: sort based on metric
    const sorted = [...board].sort((a, b) => {
      const aVal = a[metric] || 0;
      const bVal = b[metric] || 0;
  
      // descending order (higher value = better rank)
      return bVal - aVal;
    });
  
    // Step 2: assign ranks with tie handling
    let rank = 1;
    let prevValue = null;
    let skip = 0;
  
    const result = sorted.map((user, index) => {
      const value = user[metric] || 0;
  
      if (prevValue !== null) {
        if (value === prevValue) {
          skip++; // same rank
        } else {
          rank += skip + 1;
          skip = 0;
        }
      }
  
      prevValue = value;
  
      return {
        ...user,
        rank,
      };
    });
  
    return result;
  }
  
  module.exports = {
    calculateRank,
  };