import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg overflow-hidden my-6 border border-[#333333] shadow-lg bg-[#1E1E1E]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] text-[#A0A0A0] text-xs font-mono uppercase tracking-wider select-none">
        <span>{language || 'code'}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 hover:text-white transition-colors py-1 px-2 rounded-md hover:bg-[#3E3E3E]"
          aria-label="Copy code"
        >
          {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          <span>{isCopied ? 'Copied' : 'Copy code'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono text-[#D4D4D4]">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ background: 'transparent', padding: 0, margin: 0 }}
          wrapLines={true}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="markdown-body prose prose-invert max-w-none w-full
      prose-p:leading-relaxed prose-p:text-[15px] prose-p:text-[#E0E0E0] prose-p:my-3
      prose-headings:text-[#F2F2F2] prose-headings:font-semibold prose-headings:my-5
      prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
      prose-a:text-[#A0C4FF] prose-a:no-underline hover:prose-a:underline
      prose-strong:text-[#F2F2F2] prose-strong:font-semibold
      prose-ul:list-disc prose-ul:pl-5
      prose-ol:list-decimal prose-ol:pl-5
      prose-li:my-1 prose-li:text-[#E0E0E0] text-[15px]
      prose-blockquote:border-l-4 prose-blockquote:border-[#444] prose-blockquote:bg-[#2A2A2A] prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:my-4 prose-blockquote:rounded-r-md prose-blockquote:italic
      prose-code:text-[#D4D4D4] prose-code:bg-[#2A2A2A] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props: any) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            
            // Check if it's a block code (has newlines) or has a language match
            const isBlock = match || (String(children).includes('\n'));
            
            if (!isBlock) {
              return (
                <code {...rest} className={className}>
                  {children}
                </code>
              );
            }
            
            const language = match ? match[1] : 'text';
            return (
              <CodeBlock 
                language={language} 
                value={String(children).replace(/\n$/, '')} 
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
