// fix-encoding.js - Clean file encoding using Node
const fs = require('fs');
const path = require('path');

const file = 'src/TrainerMobileApp.jsx';

// Read file
let content = fs.readFileSync(file, 'utf8');

// Fix all encoding issues
const fixes = {
  'â"€': '─',
  'Â§': '§', 
  'âŸ³': '⟳',
  'âš ': '⚠',
  'ðŸ"±': '📱',
  'ðŸ""': '🔔',
  'â€¢': '•',
  'Â·': '·',
  'âœ"': '✓',
  'âœ•': '✕',
  'âœˆ': '✈',
  'â†'': '→',
  'â˜…': '★',
  'â—‰': '◉',
  'ðŸ"…': '📅',
  'ðŸ"': '📍',
  'ðŸ'¥': '👥',
  'â±': '⏱',
  'â—': '●'
};

// Apply fixes
for (const [bad, good] of Object.entries(fixes)) {
  content = content.split(bad).join(good);
}

// Write back with clean UTF-8
fs.writeFileSync(file, content, 'utf8');

console.log('✅ Encoding fixed!');
