import { StyleSheet } from "@react-pdf/renderer";

// Define a RAW styles object to safely extend style properties across templates.
// Spreading a compiled StyleSheet object results in corrupted stylesheet registrations inside @react-pdf/renderer.
export const rawPdfStyles = {
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.35,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
    color: "#000000",
  },
  header: {
    marginBottom: 6,
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    textTransform: "uppercase",
    letterSpacing: -0.5,
    lineHeight: 1.15,
    marginBottom: 4,
  },
  contactContainer: {
    marginBottom: 8,
  },
  contactLine: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#4a4a4a",
    lineHeight: 1.25,
    marginBottom: 1.5,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginBottom: 4,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#000000",
  },
  summaryText: {
    fontSize: 9.5,
    lineHeight: 1.35,
    textAlign: "justify",
    color: "#222222",
  },
  entryContainer: {
    marginBottom: 5,
  },
  rowJustified: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1,
  },
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#000000",
  },
  entrySubtitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: "#333333",
    marginBottom: 2,
  },
  entryDate: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#000000",
    textAlign: "right",
  },
  descriptionText: {
    fontSize: 9.5,
    lineHeight: 1.35,
    color: "#222222",
    textAlign: "justify",
    marginLeft: 8,
    marginBottom: 1,
  },
  bulletPoint: {
    flexDirection: "row",
    marginLeft: 8,
    marginBottom: 1.5,
  },
  bulletSign: {
    width: 10,
    fontSize: 9.5,
    color: "#222222",
  },
  bulletContent: {
    fontSize: 9.5,
    lineHeight: 1.35,
    color: "#222222",
    textAlign: "justify",
  },
  skillLine: {
    fontSize: 9.5,
    lineHeight: 1.35,
    color: "#222222",
    marginBottom: 1.5,
    textAlign: "justify",
  },
  certificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1.5,
  },
  certificationMain: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#000000",
  },
  certificationDate: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#000000",
    textAlign: "right",
  },
};

// --- STANDARD ATS ---
export const pdfStyles = StyleSheet.create(rawPdfStyles as any);

// --- ATS CLEAN (ASM CORE) ---
export const atsCleanStyles = StyleSheet.create({
  ...rawPdfStyles,
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.35,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
    color: "#000000",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    textTransform: "uppercase",
    lineHeight: 1.15,
    marginBottom: 4,
  },
  sectionTitleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginBottom: 4,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textTransform: "uppercase",
    color: "#000000",
  },
  entrySubtitle: {
    fontFamily: "Helvetica",
    fontStyle: "italic",
    fontSize: 9.5,
    color: "#333333",
    marginBottom: 2,
  },
} as any);

// --- HARVARD WSO (SERIF) ---
export const harvardStyles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    lineHeight: 1.3,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
    color: "#000000",
  },
  header: {
    marginBottom: 6,
    textAlign: "center",
  },
  name: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 1.15,
    marginBottom: 4,
    textAlign: "center",
  },
  contactContainer: {
    marginBottom: 8,
  },
  contactLine: {
    fontFamily: "Times-Roman",
    fontSize: 8.5,
    color: "#111111",
    lineHeight: 1.25,
    marginBottom: 1.5,
    textAlign: "center",
  },
  section: {
    marginBottom: 8,
  },
  sectionTitleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginBottom: 4,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#000000",
  },
  summaryText: {
    fontSize: 9.5,
    lineHeight: 1.3,
    textAlign: "justify",
    color: "#111111",
  },
  entryContainer: {
    marginBottom: 5,
  },
  rowJustified: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1,
  },
  entryTitle: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    color: "#000000",
  },
  entrySubtitle: {
    fontFamily: "Times-Italic",
    fontSize: 9.5,
    color: "#111111",
    marginBottom: 2,
  },
  entryDate: {
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: "#111111",
    textAlign: "right",
  },
  descriptionText: {
    fontSize: 9.5,
    lineHeight: 1.3,
    color: "#111111",
    textAlign: "justify",
    marginLeft: 12,
    marginBottom: 1,
  },
  bulletPoint: {
    flexDirection: "row",
    marginLeft: 12,
    marginBottom: 1.5,
  },
  bulletSign: {
    width: 10,
    fontSize: 9.5,
    color: "#111111",
  },
  bulletContent: {
    fontSize: 9.5,
    lineHeight: 1.3,
    color: "#111111",
    textAlign: "justify",
  },
  skillLine: {
    fontSize: 9.5,
    lineHeight: 1.3,
    color: "#111111",
    marginBottom: 1.5,
    textAlign: "justify",
  },
  certificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1.5,
  },
  certificationMain: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    color: "#000000",
  },
  certificationDate: {
    fontFamily: "Times-Bold",
    fontSize: 9,
    color: "#000000",
    textAlign: "right",
  },
} as any);

// --- SILICON VALLEY (JAKES) ---
export const jakesStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.3,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
    color: "#000000",
  },
  header: {
    marginBottom: 6,
    textAlign: "center",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 1.15,
    marginBottom: 4,
    textAlign: "center",
  },
  contactContainer: {
    marginBottom: 8,
  },
  contactLine: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#111111",
    lineHeight: 1.25,
    marginBottom: 1.5,
    textAlign: "center",
  },
  section: {
    marginBottom: 8,
  },
  sectionTitleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginBottom: 4,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#000000",
  },
  summaryText: {
    fontSize: 9.5,
    lineHeight: 1.3,
    textAlign: "justify",
    color: "#111111",
  },
  entryContainer: {
    marginBottom: 5,
  },
  rowJustified: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1,
  },
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#000000",
  },
  entrySubtitle: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 9.5,
    color: "#111111",
    marginBottom: 2,
  },
  entryDate: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111111",
    textAlign: "right",
  },
  descriptionText: {
    fontSize: 9.5,
    lineHeight: 1.3,
    color: "#111111",
    textAlign: "justify",
    marginLeft: 10,
    marginBottom: 1,
  },
  bulletPoint: {
    flexDirection: "row",
    marginLeft: 10,
    marginBottom: 1.5,
  },
  bulletSign: {
    width: 10,
    fontSize: 9.5,
    color: "#111111",
  },
  bulletContent: {
    fontSize: 9.5,
    lineHeight: 1.3,
    color: "#111111",
    textAlign: "justify",
  },
  skillLine: {
    fontSize: 9.5,
    lineHeight: 1.3,
    color: "#111111",
    marginBottom: 1.5,
    textAlign: "justify",
  },
  certificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1.5,
  },
  certificationMain: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#000000",
  },
  certificationDate: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#000000",
    textAlign: "right",
  },
} as any);

// --- EXECUTIVE ATS ---
export const executiveStyles = StyleSheet.create({
  ...rawPdfStyles,
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.35,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
    color: "#000000",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    textTransform: "uppercase",
    lineHeight: 1.15,
    marginBottom: 4,
  },
  contactContainer: {
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    paddingBottom: 6,
  },
  sectionTitleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    paddingBottom: 2,
    marginBottom: 4,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textTransform: "uppercase",
    color: "#000000",
  },
} as any);

// --- MANTER ORIGINAL ---
export const originalStyles = StyleSheet.create({
  ...rawPdfStyles,
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.35,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
    color: "#000000",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    textTransform: "uppercase",
    lineHeight: 1.15,
    marginBottom: 6,
  },
  sectionTitleContainer: {
    borderBottomWidth: 0,
    marginBottom: 4,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textTransform: "uppercase",
    color: "#000000",
  },
} as any);
