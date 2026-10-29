const fs = require('fs');
const file = 'src/TrainerMobileApp.jsx';

// Read as buffer first
let buffer = fs.readFileSync(file);
let content = buffer.toString('utf8');

// Count issues before
const beforeIssues = (content.match(/ðŸ|â€|Â/g) || []).length;
console.log(`Found ${beforeIssues} corrupted sequences`);

// Only fix the most visible issues - one at a time
const criticalFixes = {
  'ðŸ""': '🔔',
  'ðŸ"±': '📱',
  'ðŸ"…': '📅', 
  'ðŸ"': '📍',
  'ðŸ'¥': '👥',
  'â—': '●',
  'âœ"': '✓',
  'âœ•': '✕',
  'âœˆ': '✈',
  'â€¢': '•',
  'Â·': '·'
};

// Apply fixes
for (const [bad, good] of Object.entries(criticalFixes)) {
  const before = content;
  content = content.split(bad).join(good);
  if (content !== before) {
    console.log(`Fixed: ${bad} → ${good}`);
  }
}

// Write back
fs.writeFileSync(file, content, 'utf8');

// Count after
const afterContent = fs.readFileSync(file, 'utf8');
const afterIssues = (afterContent.match(/ðŸ|â€|Â/g) || []).length;
console.log(`\nBefore: ${beforeIssues} issues`);
console.log(`After: ${afterIssues} issues`);
console.log(afterIssues < beforeIssues ? '✅ Improved!' : '⚠️ No change');
