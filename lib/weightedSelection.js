/**
 * Weighted game selection based on play history and skip frequency
 *
 * Algorithm:
 * - Games that are skipped more get higher weight
 * - Games that are played more get lower weight
 * - Never-picked games get a bonus to ensure they appear
 */

/**
 * Calculate weight for a single game based on its stats
 * @param {Object} stats - Game statistics { picks, played, skipped }
 * @returns {number} Weight value (higher = more likely to be picked)
 */
export function calculateGameWeight(stats) {
  const { picks = 0, played = 0, skipped = 0 } = stats;

  // If game has never been picked, default weight is 1.0
  if (picks === 0) {
    return 1.0;
  }

  // Skip weight: games with higher skip ratio get higher priority
  const skipWeight = 1 + (skipped / picks);

  // Play weight: games played more get lower priority (inverse)
  const playWeight = 1 / (1 + played);

  // Combined weight
  const weight = skipWeight * playWeight;

  return weight;
}

/**
 * Select a random game using weighted probability
 * @param {Array} games - Array of game objects
 * @param {Object} statsMap - Map of game IDs to stats { picks, played, skipped }
 * @returns {Object} Selected game
 */
export function weightedRandomPick(games, statsMap) {
  if (!games || games.length === 0) {
    throw new Error('No games available for selection');
  }

  if (games.length === 1) {
    return games[0];
  }

  const weights = [];
  let totalWeight = 0;

  // Calculate weight for each game
  games.forEach(game => {
    const stats = statsMap[game.id] || { picks: 0, played: 0, skipped: 0 };
    const weight = calculateGameWeight(stats);
    weights.push(weight);
    totalWeight += weight;
  });

  // Weighted random selection
  let random = Math.random() * totalWeight;

  for (let i = 0; i < games.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return games[i];
    }
  }

  // Fallback (should rarely reach here due to floating point)
  return games[games.length - 1];
}

/**
 * Get weight information for all games (useful for debugging/analytics)
 * @param {Array} games - Array of game objects
 * @param {Object} statsMap - Map of game IDs to stats
 * @returns {Array} Array of { game, stats, weight } objects
 */
export function getGameWeights(games, statsMap) {
  return games.map(game => {
    const stats = statsMap[game.id] || { picks: 0, played: 0, skipped: 0 };
    const weight = calculateGameWeight(stats);
    return {
      game,
      stats,
      weight
    };
  });
}
