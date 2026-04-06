// Stop words for text normalization — filtered out during stemmed matching

export const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'them', 'his', 'her', 'its', 'the', 'a', 'an', 'and', 'or', 'but', 'if',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'am', 'are',
  'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might',
  'must', 'not', 'no', 'so', 'as', 'up', 'out', 'just', 'than', 'then',
  'too', 'very', 'also', 'this', 'that', 'these', 'those', 'some', 'any',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'into', 'over', 'after', 'before', 'between', 'under', 'about', 'from',
  'here', 'there', 'when', 'where', 'how', 'what', 'which', 'who',
  'im', 'ive', 'its', 'dont', 'doesnt', 'didnt', 'cant', 'wont',
  'get', 'got', 'go', 'going', 'went', 'come', 'came',
  'like', 'really', 'much', 'well', 'back', 'even', 'still',
  'oh', 'ok', 'okay', 'yeah', 'yes', 'no', 'nah',
]);
