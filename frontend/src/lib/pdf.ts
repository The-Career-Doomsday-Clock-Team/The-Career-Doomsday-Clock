/**
 * PDF 다운로드 유틸리티
 * html2canvas + jsPDF를 사용하여 결과 영역을 PDF로 변환
 * Requirements: 4.1, 4.2, 4.3
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * 지정된 HTML 요소를 캡처하여 PDF로 다운로드
 * - 디스토피아 테마 배경색 유지
 * - 한국어/영어 글자 깨짐 방지
 * - 파일명: career-doomsday-{timestamp}.pdf
 */
export async function downloadResultAsPdf(element: HTMLElement): Promise<void> {
  // 폰트 로딩 완료 대기
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // html2canvas로 요소를 이미지로 캡처
  const canvas = await html2canvas(element, {
    backgroundColor: "#0a0a0f",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    // 클론된 DOM에서 폰트를 시스템 폰트로 fallback 지정
    onclone: (clonedDoc: Document) => {
      const clonedEl = clonedDoc.body;
      // 한국어 지원 시스템 폰트를 fallback으로 추가
      const fallbackFonts =
        '"Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
      const monoFallback =
        '"JetBrains Mono", "D2Coding", "Consolas", "Courier New", monospace';

      // 모든 요소에 한국어 fallback 폰트 적용
      const allElements = clonedEl.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computed = window.getComputedStyle(el);
        const fontFamily = computed.fontFamily;

        // mono 폰트 계열이면 mono fallback 적용
        if (
          fontFamily.includes("mono") ||
          fontFamily.includes("JetBrains") ||
          fontFamily.includes("var(--font-mono)") ||
          fontFamily.includes("var(--font-jetbrains")
        ) {
          htmlEl.style.fontFamily = monoFallback;
        } else {
          htmlEl.style.fontFamily = fontFamily + ", " + fallbackFonts;
        }
      });

      // CSS 변수 기반 폰트를 직접 해결
      const style = clonedDoc.createElement("style");
      style.textContent = `
        :root {
          --font-mono: "JetBrains Mono", "D2Coding", "Consolas", monospace;
          --font-orbitron: "Orbitron", ${fallbackFonts};
        }
        * {
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
      `;
      clonedDoc.head.appendChild(style);
    },
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 사이즈 기준 PDF 생성 (mm 단위)
  const pdfWidth = 210;
  const pdfContentWidth = pdfWidth - 20; // 좌우 10mm 여백
  const ratio = pdfContentWidth / imgWidth;
  const pdfContentHeight = imgHeight * ratio;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 페이지 분할 처리
  const pageHeight = 297; // A4 높이
  const usableHeight = pageHeight - 20; // 상하 10mm 여백
  let remainingHeight = pdfContentHeight;
  let sourceY = 0;
  let page = 0;

  while (remainingHeight > 0) {
    if (page > 0) {
      pdf.addPage();
    }

    // 배경 채우기
    pdf.setFillColor(10, 10, 15);
    pdf.rect(0, 0, pdfWidth, pageHeight, "F");

    const sliceHeight = Math.min(usableHeight, remainingHeight);
    const sourceSliceHeight = sliceHeight / ratio;

    // 캔버스에서 해당 영역만 잘라서 삽입
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgWidth;
    sliceCanvas.height = Math.ceil(sourceSliceHeight);
    const ctx = sliceCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(
        canvas,
        0,
        sourceY,
        imgWidth,
        sourceSliceHeight,
        0,
        0,
        imgWidth,
        sourceSliceHeight,
      );
    }

    const sliceData = sliceCanvas.toDataURL("image/png");
    pdf.addImage(sliceData, "PNG", 10, 10, pdfContentWidth, sliceHeight);

    sourceY += sourceSliceHeight;
    remainingHeight -= sliceHeight;
    page++;
  }

  // 타임스탬프 기반 파일명
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  pdf.save(`career-doomsday-${timestamp}.pdf`);
}
