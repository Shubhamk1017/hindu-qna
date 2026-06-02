import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

const sanskritTheme = {
  'code[class*="language-"]': { color: '#5A4E42', background: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', textShadow: 'none', direction: 'ltr', textAlign: 'left', whiteSpace: 'pre', wordSpacing: 'normal', wordBreak: 'normal', lineHeight: '1.8' },
  'pre[class*="language-"]': { color: '#5A4E42', background: '#FDF8F0', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', textShadow: 'none', direction: 'ltr', textAlign: 'left', whiteSpace: 'pre', wordSpacing: 'normal', wordBreak: 'normal', lineHeight: '1.8', padding: '20px 24px', margin: '12px 0', borderRadius: '10px', border: '1.5px solid #F0D4B8', overflow: 'auto' },
  comment: { color: '#9A8E82' },
  prolog: { color: '#9A8E82' },
  doctype: { color: '#9A8E82' },
  cdata: { color: '#9A8E82' },
  punctuation: { color: '#5A4E42' },
  property: { color: '#C4661A' },
  tag: { color: '#C4661A' },
  boolean: { color: '#C4661A' },
  number: { color: '#C4661A' },
  constant: { color: '#C4661A' },
  symbol: { color: '#C4661A' },
  deleted: { color: '#C4661A' },
  selector: { color: '#E07B2A' },
  'attr-name': { color: '#E07B2A' },
  string: { color: '#E07B2A' },
  char: { color: '#E07B2A' },
  builtin: { color: '#E07B2A' },
  inserted: { color: '#E07B2A' },
  operator: { color: '#5A4E42' },
  entity: { color: '#5A4E42', cursor: 'help' },
  url: { color: '#5A4E42' },
  variable: { color: '#5A4E42' },
  atrule: { color: '#E07B2A' },
  'attr-value': { color: '#E07B2A' },
  keyword: { color: '#C4661A' },
  function: { color: '#E07B2A' },
  'class-name': { color: '#C4661A' },
  regex: { color: '#5A4E42' },
  important: { color: '#5A4E42', fontWeight: 'bold' },
};

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-serif font-bold text-gray-900 mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-serif font-bold text-gray-900 mt-4 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-serif font-semibold text-brand mt-3 mb-1.5">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-[14px] text-gray-800 leading-relaxed mb-2.5 whitespace-pre-wrap">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900 bg-brand-50 px-1 rounded">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-brand font-medium">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-[3px] border-brand bg-brand-50/50 rounded-r-lg px-4 py-3 my-3 text-[13px] text-gray-700 italic">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 my-2 text-[14px] text-gray-800">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2 text-[14px] text-gray-800">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        code: ({ inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');

          // Sanskrit / shloka code blocks — cream saffron theme
          if (!inline && match && (match[1] === 'sanskrit' || match[1] === 'devanagari')) {
            // Clean "Devanagari" prefix and normalize spacing
            let sanskritText = String(children).replace(/\n$/, '');
            sanskritText = sanskritText.replace(/^Devanagari\s*/i, '');
            sanskritText = sanskritText.replace(/([।॥])\s*/g, '$1\n').trim();

            return (
              <div className="my-4 rounded-xl overflow-hidden border border-brand-100/80 shadow-sm" style={{ background: 'linear-gradient(135deg, #FDF8F0 0%, #FAF0E4 100%)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-brand-100/60">
                  <span className="text-[10px] font-bold text-brand/70 uppercase tracking-[0.15em]">Sanskrit</span>
                </div>
                <div className="px-5 py-4">
                  <pre className="font-serif text-[15px] md:text-[16px] text-gray-800 leading-[2] whitespace-pre-wrap" style={{ letterSpacing: '0.02em' }}>
                    {sanskritText}
                  </pre>
                </div>
              </div>
            );
          }

          // Other code blocks — dark theme
          if (!inline && match) {
            return (
              <SyntaxHighlighter
                language={match[1]}
                style={sanskritTheme}
                PreTag="div"
                customStyle={{ overflowX: 'auto', whiteSpace: 'pre', borderRadius: '10px', fontSize: '13px' }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }

          // Inline code
          return (
            <code className="bg-brand-50 text-brand px-1.5 py-0.5 rounded text-[13px] font-medium border border-brand-100" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-3">{children}</pre>
        ),
        hr: () => (
          <hr className="border-gray-200 my-4" />
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-500 underline decoration-brand/30 hover:decoration-brand transition-colors">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
