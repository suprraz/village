
const MAX_HEX_32DIGIT = parseInt('ffffffffffffffffffffffffffffffff', 16);

function sortNeighbors(fromId, neighbors) {
  return neighbors.sort((fromId,neighborId) => idDistance(fromId,neighborId));
}

function idDistance(a,b) {
  const rankA = idRank(a);
  const rankB = idRank(b);

  const directDistance = Math.abs(idRank(a) - idRank(b));
  const overDistance = Math.min(rankA,rankB) + 1 - Math.max(rankA,rankB);

  return Math.min(directDistance,overDistance);
}

function idRank(id) {
  const hexId = id.replace(/-/g,'') // remove slashes
  const deciId = parseInt(hexId, 16);
  return deciId/(MAX_HEX_32DIGIT);
}

export {
  sortNeighbors, idDistance
}
