import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";
import { COMPETENCIES } from "./dataStore";
import { cleanSegmentText } from "./interviewLogic";

export async function exportSessionToWord(session, localReview) {
  const children = [
    new Paragraph({ text: "Hasil Wawancara Kompetensi", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Nama: ${session.participant?.nama || "-"}` }),
    new Paragraph({ text: `NIK: ${session.participant?.nik || "-"}` }),
    new Paragraph({ text: `Cabang: ${session.participant?.cabang || "-"}` }),
    new Paragraph({ text: `Jenis Pengukuran: ${session.jenisPengukuran}` }),
    new Paragraph({ text: `Jabatan Diuji: ${session.positionName}` }),
    new Paragraph({ text: `Tanggal Proses: ${session.participant?.tanggalProses || "-"}` }),
    new Paragraph({ text: "" }),
  ];

  (session.selectedCompetencyKeys || []).forEach((key) => {
    const comp = COMPETENCIES[key];
    const results = localReview[key] || [];
    const segTurns = session.segments?.[key]?.turns || [];

    children.push(new Paragraph({ text: comp.name, heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ text: comp.cluster, italics: true }));

    results.forEach((r) => {
      children.push(new Paragraph({ children: [new TextRun({ text: `${r.keyBehaviour}: `, bold: true }), new TextRun(r.finalLevel)] }));
      if (r.assessorNote) children.push(new Paragraph({ text: `Catatan: ${r.assessorNote}` }));
    });

    children.push(new Paragraph({ text: "Transkrip:", heading: HeadingLevel.HEADING_2 }));
    segTurns.forEach((t) => {
      const speaker = t.role === "assistant" ? "Pewawancara" : "Kandidat";
      children.push(new Paragraph({ children: [new TextRun({ text: `${speaker}: `, bold: true }), new TextRun(cleanSegmentText(t.content))] }));
    });
    children.push(new Paragraph({ text: "" }));
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `wawancara-${session.participant?.nama || session.id}.docx`);
}
