#!/usr/bin/env node
/**
 * validate-braces.js — Detect mismatched braces/parens/brackets in JS files.
 * Catches the common "extra }" or "missing }" that node -c sometimes misreports.
 * Usage: node scripts/validate-braces.js file1.js file2.js ...
 */
const fs = require('fs');
const path = require('path');

const PAIRS = { '{': '}', '(': ')', '[': ']' };
const CLOSE = new Set(Object.values(PAIRS));
const OPEN = new Set(Object.keys(PAIRS));

function validateFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const stack = [];
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    let line = 1;
    const errors = [];

    for (let i = 0; i < code.length; i++) {
        const c = code[i];
        const prev = i > 0 ? code[i - 1] : '';

        if (c === '\n') { line++; inLineComment = false; continue; }
        if (inLineComment) continue;
        if (inBlockComment) { if (c === '/' && prev === '*') inBlockComment = false; continue; }
        if (c === '/' && code[i + 1] === '/') { inLineComment = true; continue; }
        if (c === '/' && code[i + 1] === '*') { inBlockComment = true; continue; }

        if (inString) {
            if (c === stringChar && prev !== '\\') inString = false;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; continue; }

        if (OPEN.has(c)) {
            stack.push({ char: c, line: line });
        } else if (CLOSE.has(c)) {
            if (stack.length === 0) {
                errors.push('Line ' + line + ': unexpected "' + c + '" - no matching opener');
            } else {
                const top = stack.pop();
                if (PAIRS[top.char] !== c) {
                    errors.push('Line ' + line + ': "' + c + '" closes "' + top.char + '" from line ' + top.line);
                }
            }
        }
    }

    for (const remaining of stack) {
        errors.push('Line ' + remaining.line + ': unclosed "' + remaining.char + '"');
    }

    return errors;
}

// Main — pass files as arguments
const files = process.argv.slice(2);
if (files.length === 0) {
    console.log('Usage: node validate-braces.js file1.js file2.js ...');
    process.exit(0);
}

let totalErrors = 0;

for (const file of files) {
    if (!fs.existsSync(file)) { console.log('SKIP: ' + file + ' (not found)'); continue; }
    const errors = validateFile(file);
    if (errors.length > 0) {
        totalErrors += errors.length;
        console.log('\nFAIL: ' + file);
        errors.forEach(function(e) { console.log('  ' + e); });
    }
}

console.log('\n=== Brace Validation: ' + files.length + ' files, ' + totalErrors + ' errors ===');
process.exit(totalErrors > 0 ? 1 : 0);
