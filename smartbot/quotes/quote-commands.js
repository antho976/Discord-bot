function handleQuoteCommand(quoteManager, content, username) {
  const lower = content.toLowerCase().trim();

  // !quote — random quote
  if (/^!quote\s*$/i.test(lower)) {
    const quote = quoteManager.getRandom();
    if (!quote) return 'No quotes saved yet. Add one with `!quote add "text" — author`';
    return `💬 "${quote.text}" — ${quote.author}`;
  }

  // !quote add "text" — author
  const addMatch = content.match(/^!quote\s+add\s+"([^"]+)"\s*(?:—|-)\s*(.+)$/i);
  if (addMatch) {
    const quote = quoteManager.add(addMatch[1], addMatch[2], username);
    if (!quote) return 'Could not add the quote. Make sure it is between 3 and 500 characters.';
    return `Quote #${quote.id} added!`;
  }

  // !quote remove <id>
  const removeMatch = content.match(/^!quote\s+(?:remove|delete)\s+#?(\d+)$/i);
  if (removeMatch) {
    const removed = quoteManager.remove(parseInt(removeMatch[1], 10));
    return removed ? 'Quote removed.' : 'Quote not found.';
  }

  // !quote search <query>
  const searchMatch = content.match(/^!quote\s+search\s+(.+)$/i);
  if (searchMatch) {
    const results = quoteManager.search(searchMatch[1]);
    if (results.length === 0) return 'No quotes found matching that search.';
    const display = results.slice(0, 5).map(q => `#${q.id}: "${q.text}" — ${q.author}`);
    return display.join('\n');
  }

  // !quote <tag>
  const tagMatch = content.match(/^!quote\s+(\w+)$/i);
  if (tagMatch && tagMatch[1] !== 'add' && tagMatch[1] !== 'remove' && tagMatch[1] !== 'search') {
    const quote = quoteManager.getRandom(tagMatch[1]);
    if (!quote) return `No quotes found with tag "${tagMatch[1]}"`;
    return `💬 "${quote.text}" — ${quote.author}`;
  }

  return null;
}

export { handleQuoteCommand };