
const MAX_HEX_32DIGIT = parseInt('ffffffffffffffffffffffffffffffff', 16);


function getSwapCandidate(fromId, currentArr, availableArr) {
  if(!currentArr || !currentArr.length || !availableArr || !availableArr.length) {
    return null;
  }

  const currentSorted = sortNeighbors(fromId, currentArr);
  const availableSorted = sortNeighbors(fromId, availableArr);

  const worstCurrent = currentSorted[currentSorted.length-1];
  const candidateId = availableSorted[0];

  if(idDistance(fromId, candidateId) < idDistance(fromId, worstCurrent)) {
    return {
      oldId: worstCurrent,
      toId: candidateId
    }
  }
  return null;
}

function sortNeighbors(fromId, neighbors) {
  return neighbors.sort((a,b) => idDistance(fromId,a) > idDistance(fromId,b));
}

function idDistance(a,b) {
  if(!a || !b) {
    return 1;
  }
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
  sortNeighbors, idDistance, getSwapCandidate
}
