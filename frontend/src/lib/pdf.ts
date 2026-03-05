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
 * - 파일명: career-doomsday-{timestamp}.pdf
 */
export async function downloadResultAsPdf(element: HTMLElement): Promise<void> {
  // html2canvas로 요소를 이미지로 캡처
  const canvas = await html2canvas(element, {
    backgroundColor: "#0a0a0f", // 디스토피아 테마 배경색
    scale: 2, // 고해상도 캡처
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 사이즈 기준 PDF 생성 (mm 단위)
  const pdfWidth = 210;
  const pdfContentWidth = pdfWidth - 20; // 좌우 10mm 여백
  const ratio = pdfContentWidth / imgWidth;
  const pdfContentHeight = imgHeight * ratio;

  const pdf = new jsPDF({
    orientation: pdfContentHeight > 297 ? "portrait" : "portrait",
    unit: "mm",
    format: "a4",
  });

  // 배경색 채우기
  pdf.setFillColor(10, 10, 15);

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
    sliceCanvas.height = sourceSliceHeight;
    const ctx = sliceCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(
        canvas,
        0, sourceY, imgWidth, sourceSliceHeight,
        0, 0, imgWidth, sourceSliceHeight
      );
    }

    const sliceData = sliceCanvas.toDataURL("image/png");
    pdf.addImage(sliceData, "PNG", 10, 10, pdfContentWidth, sliceHeight);

    sourceY += sourceSliceHeight;
    remainingHeight -= sliceHeight;
    page++;
  }

  // 타임스탬프 기반 파일명
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  pdf.save(`career-doomsday-${timestamp}.pdf`);
}
