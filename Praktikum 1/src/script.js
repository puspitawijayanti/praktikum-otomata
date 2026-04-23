const keywordSets = {
      auto: [],
      c: [
        'auto','break','case','char','const','continue','default','do','double','else','enum','extern','float',
        'for','goto','if','inline','int','long','register','restrict','return','short','signed','sizeof','static',
        'struct','switch','typedef','union','unsigned','void','volatile','while','bool','class','namespace','using',
        'include','define','nullptr','new','delete','public','private','protected','template','typename','this'
      ],
      java: [
        'abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do',
        'double','else','enum','extends','final','finally','float','for','goto','if','implements','import','instanceof',
        'int','interface','long','native','new','package','private','protected','public','return','short','static',
        'strictfp','super','switch','synchronized','this','throw','throws','transient','try','void','volatile','while'
      ],
      javascript: [
        'await','break','case','catch','class','const','continue','debugger','default','delete','do','else','export','extends',
        'false','finally','for','function','if','import','in','instanceof','let','new','null','return','super','switch',
        'this','throw','true','try','typeof','var','void','while','with','yield'
      ],
      python: [
        'and','as','assert','async','await','break','class','continue','def','del','elif','else','except','false','finally',
        'for','from','global','if','import','in','is','lambda','none','nonlocal','not','or','pass','raise','return','true',
        'try','while','with','yield'
      ],
      custom: []
    };

    const multiCharSymbols = [
      '===','!==','>>=','<<=','++','--','+=','-=','*=','/=','%=','==','!=','<=','>=','&&','||','->','::','<<','>>','=>','**','//'
    ];

    const singleCharSymbols = new Set([
      '+','-','*','/','%','=','<','>','!','&','|','^','~','(',')','{','}','[',']',';',':',',','.','?','#'
    ]);

    const sourceCode = document.getElementById('sourceCode');
    const languageMode = document.getElementById('languageMode');
    const tokenTableBody = document.getElementById('tokenTableBody');
    const keywordsGroup = document.getElementById('keywordsGroup');
    const symbolsGroup = document.getElementById('symbolsGroup');
    const variablesGroup = document.getElementById('variablesGroup');
    const mathGroup = document.getElementById('mathGroup');
    const stats = document.getElementById('stats');
    const insightChips = document.getElementById('insightChips');

    document.getElementById('analyzeBtn').addEventListener('click', analyzeSource);
    document.getElementById('exampleBtn').addEventListener('click', loadExample);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('exportBtn').addEventListener('click', exportJSON);

    let latestResult = null;

    function detectLanguage(code) {
      const scores = { c: 0, java: 0, javascript: 0, python: 0 };

      if (/^\s*#include\b/m.test(code)) scores.c += 4;
      if (/\bprintf\s*\(/.test(code)) scores.c += 2;
      if (/\bscanf\s*\(/.test(code)) scores.c += 2;
      if (/\bint\s+main\s*\(/.test(code)) scores.c += 3;

      if (/\bpublic\s+class\b/.test(code)) scores.java += 4;
      if (/\bSystem\.out\.print/.test(code)) scores.java += 3;
      if (/\bpublic\s+static\s+void\s+main\b/.test(code)) scores.java += 4;

      if (/\bfunction\b/.test(code)) scores.javascript += 4;
      if (/\b(let|const|var)\b/.test(code)) scores.javascript += 3;
      if (/=>/.test(code)) scores.javascript += 2;
      if (/console\.log\s*\(/.test(code)) scores.javascript += 2;

      if (/^\s*def\b/m.test(code)) scores.python += 4;
      if (/^\s*(from\s+\w+\s+import|import\s+\w+)/m.test(code)) scores.python += 3;
      if (/\belif\b/.test(code)) scores.python += 2;
      if (/\bprint\s*\(/.test(code)) scores.python += 1;
      if (/\bTrue\b|\bFalse\b/.test(code)) scores.python += 2;
      if (/:\s*(#.*)?$/m.test(code)) scores.python += 1;

      let best = 'custom';
      let max = -1;
      for (const [lang, score] of Object.entries(scores)) {
        if (score > max) {
          max = score;
          best = lang;
        }
      }
      return max <= 0 ? 'custom' : best;
    }

    function buildKeywordSet(activeLanguage) {
      return new Set(keywordSets[activeLanguage] || []);
    }

    function isIdentifierStart(ch) {
      return /[A-Za-z_]/.test(ch);
    }

    function isIdentifierPart(ch) {
      return /[A-Za-z0-9_]/.test(ch);
    }

    function isDigit(ch) {
      return /[0-9]/.test(ch);
    }

    function isPythonStringPrefixAt(code, i) {
      const prefixes = ['f','r','u','b','fr','rf','br','rb','F','R','U','B','FR','RF','BR','RB','Fr','fR','Rf','rF','Br','bR','Rb','rB'];
      for (const prefix of prefixes) {
        const quote = code[i + prefix.length];
        if ((quote === '"' || quote === "'") && code.slice(i, i + prefix.length) === prefix) {
          return prefix;
        }
      }
      return null;
    }

    function tokenize(code, keywordSet, activeLanguage) {
      const tokens = [];
      let i = 0;
      let line = 1;
      let col = 1;

      function pushToken(value, type, startLine, startCol) {
        tokens.push({ value, type, line: startLine, col: startCol });
      }

      function advanceChar(ch) {
        if (ch === '\n') {
          line += 1;
          col = 1;
        } else {
          col += 1;
        }
      }

      function advanceString(str) {
        for (const ch of str) advanceChar(ch);
      }

      while (i < code.length) {
        const ch = code[i];

        if (ch === ' ' || ch === '\t' || ch === '\r') {
          advanceChar(ch);
          i += 1;
          continue;
        }

        if (ch === '\n') {
          advanceChar(ch);
          i += 1;
          continue;
        }

        const startLine = line;
        const startCol = col;

        if (activeLanguage === 'python') {
          const prefix = isPythonStringPrefixAt(code, i);
          if (prefix) {
            const quote = code[i + prefix.length];
            let value = prefix + quote;
            i += prefix.length + 1;
            advanceString(prefix + quote);
            while (i < code.length) {
              const current = code[i];
              value += current;
              advanceChar(current);
              i += 1;
              if (current === '\\' && i < code.length) {
                value += code[i];
                advanceChar(code[i]);
                i += 1;
                continue;
              }
              if (current === quote) break;
            }
            pushToken(value, 'string', startLine, startCol);
            continue;
          }
        }

        if (activeLanguage !== 'python' && ch === '/' && code[i + 1] === '/') {
          let value = '//';
          i += 2;
          advanceString('//');
          while (i < code.length && code[i] !== '\n') {
            value += code[i];
            advanceChar(code[i]);
            i += 1;
          }
          pushToken(value, 'comment', startLine, startCol);
          continue;
        }

        if (activeLanguage !== 'python' && ch === '/' && code[i + 1] === '*') {
          let value = '/*';
          i += 2;
          advanceString('/*');
          while (i < code.length) {
            if (code[i] === '*' && code[i + 1] === '/') {
              value += '*/';
              i += 2;
              advanceString('*/');
              break;
            }
            value += code[i];
            advanceChar(code[i]);
            i += 1;
          }
          pushToken(value, 'comment', startLine, startCol);
          continue;
        }

        if (ch === '#') {
          let value = '#';
          i += 1;
          advanceChar('#');
          while (i < code.length && code[i] !== '\n') {
            value += code[i];
            advanceChar(code[i]);
            i += 1;
          }
          pushToken(value, activeLanguage === 'c' ? 'preprocessor' : 'comment', startLine, startCol);
          continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
          const quote = ch;
          let value = quote;
          i += 1;
          advanceChar(quote);
          while (i < code.length) {
            const current = code[i];
            value += current;
            advanceChar(current);
            i += 1;
            if (current === '\\' && i < code.length) {
              value += code[i];
              advanceChar(code[i]);
              i += 1;
              continue;
            }
            if (current === quote) break;
          }
          pushToken(value, 'string', startLine, startCol);
          continue;
        }

        if (isDigit(ch)) {
          let value = ch;
          i += 1;
          advanceChar(ch);
          while (i < code.length && /[0-9.]/.test(code[i])) {
            value += code[i];
            advanceChar(code[i]);
            i += 1;
          }
          pushToken(value, 'number', startLine, startCol);
          continue;
        }

        if (isIdentifierStart(ch)) {
          let value = ch;
          i += 1;
          advanceChar(ch);
          while (i < code.length && isIdentifierPart(code[i])) {
            value += code[i];
            advanceChar(code[i]);
            i += 1;
          }
          const type = keywordSet.has(value.toLowerCase()) ? 'keyword' : 'identifier';
          pushToken(value, type, startLine, startCol);
          continue;
        }

        const three = code.slice(i, i + 3);
        const two = code.slice(i, i + 2);

        if (multiCharSymbols.includes(three)) {
          pushToken(three, 'symbol', startLine, startCol);
          i += 3;
          advanceString(three);
          continue;
        }

        if (multiCharSymbols.includes(two)) {
          pushToken(two, 'symbol', startLine, startCol);
          i += 2;
          advanceString(two);
          continue;
        }

        if (singleCharSymbols.has(ch)) {
          pushToken(ch, 'symbol', startLine, startCol);
          i += 1;
          advanceChar(ch);
          continue;
        }

        pushToken(ch, 'other', startLine, startCol);
        i += 1;
        advanceChar(ch);
      }

      return tokens;
    }

    function prevMeaningfulToken(tokens, startIndex) {
      for (let i = startIndex; i >= 0; i -= 1) {
        const token = tokens[i];
        if (token.type !== 'comment' && token.type !== 'preprocessor') return token;
      }
      return null;
    }

    function nextMeaningfulToken(tokens, startIndex) {
      for (let i = startIndex; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (token.type !== 'comment' && token.type !== 'preprocessor') return token;
      }
      return null;
    }

    function markPythonImports(tokens, annotated) {
      for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (token.type === 'keyword' && token.value === 'import') {
          let j = i + 1;
          while (j < tokens.length && tokens[j].line === token.line) {
            const t = annotated[j];
            if (t.type === 'identifier') t.role = 'module';
            j += 1;
          }
        }
        if (token.type === 'keyword' && token.value === 'from') {
          let j = i + 1;
          while (j < tokens.length && tokens[j].line === token.line) {
            const t = annotated[j];
            if (t.type === 'identifier') t.role = 'module';
            j += 1;
          }
        }
      }
    }

    function annotateTokens(tokens, activeLanguage) {
      const annotated = tokens.map(token => ({ ...token, role: null }));

      if (activeLanguage === 'python') {
        markPythonImports(tokens, annotated);
      }

      for (let i = 0; i < annotated.length; i += 1) {
        const token = annotated[i];
        if (token.type !== 'identifier' || token.role === 'module') continue;

        const prev = prevMeaningfulToken(annotated, i - 1);
        const next = nextMeaningfulToken(annotated, i + 1);

        const isFunctionDefinition =
          (activeLanguage === 'python' && prev && prev.type === 'keyword' && prev.value === 'def') ||
          (activeLanguage === 'javascript' && prev && prev.type === 'keyword' && prev.value === 'function');

        const isMethodCall =
          prev && prev.type === 'symbol' && prev.value === '.' &&
          next && next.type === 'symbol' && next.value === '(';

        const isFunctionCall =
          next && next.type === 'symbol' && next.value === '(' &&
          !(prev && prev.type === 'keyword' && ['if','for','while','switch','return','def','function'].includes(prev.value));

        token.role = (isFunctionDefinition || isMethodCall || isFunctionCall) ? 'function' : 'variable';
      }

      return annotated;
    }

    function categorizeTaskGroup(token) {
      if (token.type === 'keyword') return 'Reserve Word';
      if (token.type === 'symbol') return 'Simbol/Tanda Baca';
      if (token.type === 'identifier' && token.role === 'variable') return 'Variabel';
      if (token.type === 'identifier' && (token.role === 'function' || token.role === 'module')) return 'Lainnya';
      if (token.type === 'number') return 'Angka';
      if (token.type === 'string') return 'String';
      if (token.type === 'comment') return 'Komentar';
      if (token.type === 'preprocessor') return 'Lainnya';
      return 'Lainnya';
    }

    function getBadgeClass(type) {
      return {
        keyword: 'b-keyword',
        symbol: 'b-symbol',
        identifier: 'b-identifier',
        function: 'b-function',
        module: 'b-module',
        number: 'b-number',
        string: 'b-string',
        comment: 'b-comment',
        preprocessor: 'b-preprocessor',
        other: 'b-other'
      }[type] || 'b-other';
    }

    function displayLexerType(token) {
      if (token.type === 'identifier' && token.role === 'function') return 'function';
      if (token.type === 'identifier' && token.role === 'module') return 'module';
      return token.type;
    }

    function stripInlineComments(line, activeLanguage) {
      if (activeLanguage === 'python') {
        return line.replace(/#.*$/g, '');
      }
      return line.replace(/\/\/.*$/g, '').replace(/\/\*.*?\*\//g, '');
    }

    function stripStringLiterals(text) {
      return text
        .replace(/f"(?:\\.|[^"\\])*"/g, '""')
        .replace(/f'(?:\\.|[^'\\])*'/g, "''")
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/`(?:\\.|[^`\\])*`/g, '``');
    }

    function normalizeMathCandidate(text) {
      let compact = text.replace(/\s+/g, ' ').trim();
      const hadSemicolon = /;\s*$/.test(compact);
      compact = compact.replace(/;$/, '').trim();
      compact = stripStringLiterals(compact);

      compact = compact.replace(/^(let|const|var)\s+/i, '');
      compact = compact.replace(/^(?:(?:unsigned|signed|short|long)\s+)*(?:int|float|double|char|bool)\s+/i, '');

      compact = compact.trim();
      if (hadSemicolon) compact += ';';
      return compact;
    }

    function looksLikeMathStatement(text) {
        const compact = normalizeMathCandidate(text).replace(/;$/, '').trim();
        if (!compact) return false;
        if (/^#/.test(compact)) return false;
        if (/[{}]/.test(compact)) return false;
        if (/^(if|elif|else|for|while|switch|return|print|import|from|def|function)\b/i.test(compact)) return false;
        if (/^(break|continue|pass)\b/i.test(compact)) return false;

        const functionHeaderPattern = /^[A-Za-z_][A-Za-z0-9_<>\[\]\s\*]*\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)$/;
        if (functionHeaderPattern.test(compact)) return false;

        const match = compact.match(/^([A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\))\s*=\s*(.+)$/);
        if (!match) return false;

        const rightSide = match[2].trim();
        if (/(==|!=|<=|>=)/.test(compact)) return false;
        if (!/[+\-*/%^]/.test(rightSide)) return false;
        return true;
    }

    function extractMathStatements(code, activeLanguage) {
      const rawLines = code.split('\n');
      const candidates = [];

      for (let line of rawLines) {
        let cleaned = stripInlineComments(line, activeLanguage).trim();
        if (!cleaned) continue;
        if (looksLikeMathStatement(cleaned)) {
          candidates.push(normalizeMathCandidate(cleaned));
        }
      }

      return [...new Set(candidates)];
    }

    function summarize(tokens, mathStatements) {
      const keywords = new Set();
      const symbols = new Set();
      const variables = new Set();
      const functions = new Set();
      const modules = new Set();
      let symbolCount = 0;
      let keywordCount = 0;
      let variableCount = 0;

      tokens.forEach(token => {
        if (token.type === 'keyword') {
          keywords.add(token.value);
          keywordCount += 1;
        }
        if (token.type === 'symbol') {
          symbols.add(token.value);
          symbolCount += 1;
        }
        if (token.type === 'identifier' && token.role === 'variable') {
          variables.add(token.value);
          variableCount += 1;
        }
        if (token.type === 'identifier' && token.role === 'function') {
          functions.add(token.value);
        }
        if (token.type === 'identifier' && token.role === 'module') {
          modules.add(token.value);
        }
      });

      return {
        totalTokens: tokens.length,
        keywordCount,
        symbolCount,
        variableCount,
        keywords: [...keywords],
        symbols: [...symbols],
        variables: [...variables],
        functionNames: [...functions],
        modules: [...modules],
        mathStatements
      };
    }

    function renderList(container, items, emptyMessage) {
      container.innerHTML = '';
      if (!items.length) {
        container.innerHTML = `<span class="muted">${emptyMessage}</span>`;
        return;
      }
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = item;
        container.appendChild(div);
      });
    }

    function renderMathList(items) {
      mathGroup.innerHTML = '';
      if (!items.length) {
        mathGroup.innerHTML = '<span class="muted">Tidak ditemukan ekspresi matematika.</span>';
        return;
      }
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'math-item';
        div.textContent = item;
        mathGroup.appendChild(div);
      });
    }

    function renderStats(summary) {
      stats.innerHTML = `
        <div class="stat"><span class="label">Total token</span><strong>${summary.totalTokens}</strong></div>
        <div class="stat"><span class="label">Reserve words</span><strong>${summary.keywordCount}</strong></div>
        <div class="stat"><span class="label">Simbol & tanda baca</span><strong>${summary.symbolCount}</strong></div>
        <div class="stat"><span class="label">Variabel</span><strong>${summary.variableCount}</strong></div>
      `;
    }

    function renderInsights(summary, tokens, activeLanguage) {
      insightChips.innerHTML = '';
      const commentCount = tokens.filter(t => t.type === 'comment').length;
      const stringCount = tokens.filter(t => t.type === 'string').length;
      const numberCount = tokens.filter(t => t.type === 'number').length;
      const functionCount = summary.functionNames ? summary.functionNames.length : 0;
      const preprocessorCount = tokens.filter(t => t.type === 'preprocessor').length;
      const moduleCount = summary.modules ? summary.modules.length : 0;
      const chips = [
        `Mode: ${activeLanguage}`,
        `Komentar: ${commentCount}`,
        `String literal: ${stringCount}`,
        `Angka: ${numberCount}`,
        `Fungsi: ${functionCount}`,
        `Ekspresi matematika: ${summary.mathStatements.length}`
      ];
      if (moduleCount > 0) chips.push(`Modul: ${moduleCount}`);
      if (preprocessorCount > 0) chips.push(`Preprocessor: ${preprocessorCount}`);

      chips.forEach(text => {
        const span = document.createElement('span');
        span.className = 'chip';
        span.textContent = text;
        insightChips.appendChild(span);
      });
    }

    function renderTable(tokens) {
      tokenTableBody.innerHTML = '';
      if (!tokens.length) {
        tokenTableBody.innerHTML = '<tr><td colspan="6" class="muted">Tidak ada token yang diproses.</td></tr>';
        return;
      }

      tokens.forEach((token, index) => {
        const lexerType = displayLexerType(token);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><code>${escapeHtml(token.value)}</code></td>
          <td><span class="badge ${getBadgeClass(lexerType)}">${lexerType}</span></td>
          <td>${categorizeTaskGroup(token)}</td>
          <td>${token.line}</td>
          <td>${token.col}</td>
        `;
        tokenTableBody.appendChild(row);
      });
    }

    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function analyzeSource() {
      const code = sourceCode.value;
      if (!code.trim()) {
        alert('Masukkan source code terlebih dahulu.');
        return;
      }

      const activeLanguage = languageMode.value === 'auto' ? detectLanguage(code) : languageMode.value;
      const keywordSet = buildKeywordSet(activeLanguage);
      const rawTokens = tokenize(code, keywordSet, activeLanguage);
      const tokens = annotateTokens(rawTokens, activeLanguage);
      const mathStatements = extractMathStatements(code, activeLanguage);
      const summary = summarize(tokens, mathStatements);

      latestResult = {
        requestedMode: languageMode.value,
        activeLanguage,
        summary,
        tokens
      };

      renderStats(summary);
      renderList(keywordsGroup, summary.keywords, 'Tidak ada reserve word.');
      renderList(symbolsGroup, summary.symbols, 'Tidak ada simbol/tanda baca.');
      renderList(variablesGroup, summary.variables, 'Tidak ada variabel.');
      renderMathList(summary.mathStatements);
      renderInsights(summary, tokens, activeLanguage);
      renderTable(tokens);
    }

    function clearAll() {
      sourceCode.value = '';
      latestResult = null;
      renderStats({ totalTokens: 0, keywordCount: 0, symbolCount: 0, variableCount: 0 });
      renderList(keywordsGroup, [], 'Tidak ada reserve word.');
      renderList(symbolsGroup, [], 'Tidak ada simbol/tanda baca.');
      renderList(variablesGroup, [], 'Tidak ada variabel.');
      renderMathList([]);
      renderInsights({ mathStatements: [], functionNames: [], modules: [] }, [], 'auto');
      tokenTableBody.innerHTML = '<tr><td colspan="6" class="muted">Belum ada data</td></tr>';
    }

    function loadExample() {
      languageMode.value = 'auto';
      sourceCode.value = `#include <stdio.h>

int luasPersegiPanjang(int p, int l) {
    int hasil = p * l;
    int bonus = 2;
    // penyesuaian nilai
    if (hasil >= 100) {
        hasil = hasil + bonus;
    }
    return hasil;
}

int main() {
    int p = 10;
    int l = 12;
    int total = luasPersegiPanjang(p, l);
    printf("Total = %d", total);
    return 0;
}`;
      analyzeSource();
    }

    function exportJSON() {
      if (!latestResult) {
        alert('Analisis dulu sebelum mengekspor hasil.');
        return;
      }

      const blob = new Blob([JSON.stringify(latestResult, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hasil_token_praktikum1.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    clearAll();
