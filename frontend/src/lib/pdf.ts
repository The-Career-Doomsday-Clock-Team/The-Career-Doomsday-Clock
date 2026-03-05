/**
 * PDF 다운로드 유틸리티
 * html2canvas + jsPDF를 사용하여 결과 영역을 PDF로 변환
 * Requirements: 4.1, 4.2, 4.3
 */

/**
 * 스타일시트 텍스트에서 oklab/oklch/color() 함수를 투명으로 치환
 */
function sanitizeCssText(css: string): string {
  // oklab(...), oklch(...), color(display-p3 ...) 등을 transparent로 치환
  return css.replace(
    /(?:oklab|oklch|color)\([^)]*\)/gi,
    "transparent",
  );
}

/**
 * 클론된 문서의 모든 스타일시트에서 oklab/oklch 색상을 제거
 */
function sanitizeStyleSheets(clonedDoc: Document): void {
  // 1) <style> 태그 내용 치환
  const styleTags = clonedDoc.querySelectorAll("style");
  styleTags.forEach((tag) => {
    if (tag.textContent && (
      tag.textContent.includes("oklab") ||
      tag.textContent.includes("oklch") ||
      tag.textContent.includes("color(")
    )) {
      tag.textContent = sanitizeCssText(tag.textContent);
    }
  });

  // 2) <link rel="stylesheet"> 를 인라인 <style>로 교체
  const linkTags = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
  linkTags.forEach((link) => {
    try {
      // 원본 문서에서 해당 스타일시트의 cssRules를 가져옴
      const sheets = Array.from(document.styleSheets);
      const href = (link as HTMLLinkElement).href;
      const matchingSheet = sheets.find((s) => s.href === href);
      if (matchingSheet) {
        let cssText = "";
        try {
          const rules = matchingSheet.cssRules;
          for (let i = 0; i < rules.length; i++) {
            cssText += rules[i].cssText + "\n";
          }
        } catch {
          // CORS 제한으로 접근 불가 시 무시
          return;
        }
        if (cssText.includes("oklab") || cssText.includes("oklch") || cssText.includes("color(")) {
          const newStyle = clonedDoc.createElement("style");
          newStyle.textContent = sanitizeCssText(cssText);
          link.parentNode?.replaceChild(newStyle, link);
        }
      }
    } catch {
      // 무시
    }
  });
}

/**
 * 지정된 HTML 요소를 캡처하여 PDF로 다운로드
 */
export async function downloadResultAsPdf(element: HTMLElement): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

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
      // 핵심: 스타일시트에서 oklab/oklch 색상 제거
      sanitizeStyleSheets(clonedDoc);

      // CSS 변수 및 애니메이션 비활성화
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

      // 폰트 fallback 적용
      const allElements = clonedDoc.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const cs = window.getComputedStyle(el);
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
