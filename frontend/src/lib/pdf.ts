/**
 * PDF 다운로드 유틸리티
 * html2canvas + jsPDF를 사용하여 결과 영역을 PDF로 변환
 * Requirements: 4.1, 4.2, 4.3
 */

/**
 * oklab/oklch 등 html2canvas가 지원하지 않는 색상 함수를
 * 브라우저의 computed style을 통해 RGB로 변환
 */
function resolveColor(color: string): string {
  if (!color || (!color.includes("oklab") && !color.includes("oklch") && !color.includes("color("))) {
    return color;
  }
  // 임시 요소를 만들어 브라우저가 RGB로 변환하도록 함
  const temp = document.createElement("div");
  temp.style.color = color;
  temp.style.display = "none";
  document.body.appendChild(temp);
  const resolved = window.getComputedStyle(temp).color;
  document.body.removeChild(temp);
  return resolved || color;
}

/** 색상 관련 CSS 속성 목록 */
const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "columnRuleColor",
] as const;

/**
 * 지정된 HTML 요소를 캡처하여 PDF로 다운로드
 */
export async function downloadResultAsPdf(element: HTMLElement): Promise<void> {
  // 동적 import로 SSR 이슈 방지
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // 폰트 로딩 완료 대기
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const fallbackFonts =
    '"Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const monoFallback =
    '"JetBrains Mono", "D2Coding", "Consolas", "Courier New", monospace';

  const canvas = await html2canvas(element, {
    backgroundColor: "#0a0a0f",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    onclone: (clonedDoc: Document) => {
      // 1) CSS 변수 및 애니메이션 비활성화 스타일 삽입
      const style = clonedDoc.createElement("style");
      style.textContent = `
        :root {
          --font-mono: ${monoFallback};
          --font-heading: "Orbitron", ${fallbackFonts};
          --font-orbitron: "Orbitron", ${fallbackFonts};
          --font-jetbrains-mono: ${monoFallback};
        }
        * {
          animation: none !important;
          transition: none !important;
        }
      `;
      clonedDoc.head.appendChild(style);

      // 2) 모든 요소의 oklab/oklch 색상을 RGB로 변환 + 폰트 fallback 적용
      const allElements = clonedDoc.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const cs = window.getComputedStyle(el);

        // 색상 속성에서 oklab/oklch 변환
        for (const prop of COLOR_PROPS) {
          const val = cs.getPropertyValue(
            prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
          );
          if (val && (val.includes("oklab") || val.includes("oklch") || val.includes("color("))) {
            htmlEl.style[prop as unknown as number] = resolveColor(val) as unknown as string;
          }
        }

        // box-shadow, text-shadow도 처리
        const boxShadow = cs.boxShadow;
        if (boxShadow && (boxShadow.includes("oklab") || boxShadow.includes("oklch"))) {
          htmlEl.style.boxShadow = "none";
        }
        const textShadow = cs.textShadow;
        if (textShadow && (textShadow.includes("oklab") || textShadow.includes("oklch"))) {
          htmlEl.style.textShadow = "none";
        }

        // 폰트 fallback
        const ff = cs.fontFamily;
        if (ff.includes("mono") || ff.includes("JetBrains") || ff.includes("Consolas")) {
          htmlEl.style.fontFamily = monoFallback;
        } else if (ff.includes("Orbitron")) {
          htmlEl.style.fontFamily = `"Orbitron", ${fallbackFonts}`;
        } else {
          htmlEl.style.fontFamily = ff + ", " + fallbackFonts;
        }
      });
    },
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const pdfWidth = 210;
  const pdfContentWidth = pdfWidth - 20;
  const ratio = pdfContentWidth / imgWidth;
  const pdfContentHeight = imgHeight * ratio;
  const pageHeight = 297;
  const usableHeight = pageHeight - 20;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let remainingHeight = pdfContentHeight;
  let sourceY = 0;
  let page = 0;

  while (remainingHeight > 0) {
    if (page > 0) pdf.addPage();

    pdf.setFillColor(10, 10, 15);
    pdf.rect(0, 0, pdfWidth, pageHeight, "F");

    const sliceHeight = Math.min(usableHeight, remainingHeight);
    const sourceSliceHeight = sliceHeight / ratio;

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgWidth;
    sliceCanvas.height = Math.ceil(sourceSliceHeight);
    const ctx = sliceCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(
        canvas,
        0, sourceY, imgWidth, sourceSliceHeight,
        0, 0, imgWidth, sourceSliceHeight,
      );
    }

    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 10, 10, pdfContentWidth, sliceHeight);

    sourceY += sourceSliceHeight;
    remainingHeight -= sliceHeight;
    page++;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  pdf.save(`career-doomsday-${timestamp}.pdf`);
}
