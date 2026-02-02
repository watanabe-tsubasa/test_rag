export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separator?: string;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
}

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 50;

/**
 * テキストをチャンクに分割
 * @param text 分割するテキスト
 * @param options チャンクオプション
 * @returns チャンク配列
 */
export function splitTextIntoChunks(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = options;

  // 空文字やチャンクサイズ以下の場合はそのまま返す
  const trimmedText = text.trim();
  if (!trimmedText || trimmedText.length <= chunkSize) {
    return [{ content: trimmedText, chunkIndex: 0, totalChunks: 1 }];
  }

  const chunks: string[] = [];

  // 段落で分割
  const paragraphs = trimmedText.split(/\n\s*\n/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // 段落自体がチャンクサイズを超える場合は文で分割
    if (trimmedParagraph.length > chunkSize) {
      // 現在のチャンクがあれば先に追加
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // 長い段落を文で分割
      const sentenceChunks = splitBySentences(trimmedParagraph, chunkSize, chunkOverlap);
      chunks.push(...sentenceChunks);
    } else if (currentChunk.length + trimmedParagraph.length + 2 > chunkSize) {
      // 現在のチャンク + 段落がサイズを超える場合
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = trimmedParagraph;
    } else {
      // チャンクに追加
      currentChunk = currentChunk
        ? currentChunk + "\n\n" + trimmedParagraph
        : trimmedParagraph;
    }
  }

  // 最後のチャンクを追加
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // オーバーラップを適用してチャンクを結合
  const chunksWithOverlap = applyOverlap(chunks, chunkOverlap);

  const totalChunks = chunksWithOverlap.length;
  return chunksWithOverlap.map((content, index) => ({
    content,
    chunkIndex: index,
    totalChunks,
  }));
}

/**
 * 文単位で分割
 */
function splitBySentences(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  // 日本語と英語の文末を考慮した分割
  const sentences = text.split(/(?<=[。．.!?！？\n])\s*/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if (currentChunk.length + trimmedSentence.length + 1 > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // オーバーラップ用に末尾を保持
        const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
        currentChunk = currentChunk.slice(overlapStart) + " " + trimmedSentence;
      } else {
        // 1文がチャンクサイズを超える場合は強制分割
        const forcedChunks = forceChunkSplit(trimmedSentence, chunkSize, chunkOverlap);
        chunks.push(...forcedChunks.slice(0, -1));
        currentChunk = forcedChunks[forcedChunks.length - 1] || "";
      }
    } else {
      currentChunk = currentChunk
        ? currentChunk + " " + trimmedSentence
        : trimmedSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * チャンクサイズを超える文を強制分割
 */
function forceChunkSplit(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - chunkOverlap;
    if (start >= text.length - chunkOverlap) break;
  }

  return chunks;
}

/**
 * チャンク間にオーバーラップを適用
 */
function applyOverlap(chunks: string[], overlap: number): string[] {
  if (chunks.length <= 1 || overlap <= 0) {
    return chunks;
  }

  const result: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      result.push(chunks[i]);
    } else {
      // 前のチャンクの末尾をオーバーラップとして追加
      const prevChunk = chunks[i - 1];
      const overlapText = prevChunk.slice(-overlap);
      const currentWithOverlap = overlapText + " " + chunks[i];
      result.push(currentWithOverlap.trim());
    }
  }

  return result;
}
