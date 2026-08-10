/**
 * The feedback endpoint, in Google Apps Script.
 *
 * It takes the POST from the widget (src/components/Feedback.tsx), appends a row to the
 * "Feedback" sheet, and has a model classify it: sentiment and category.
 *
 * The column headers and the values the model returns are in Spanish because the sheet is
 * read in Spanish, and renaming them would orphan the columns that already exist.
 *
 * HOW TO USE IT:
 *  1. This code lives in the spreadsheet's Apps Script editor (Extensions -> Apps Script).
 *     It does not run from this repository.
 *  2. Paste your Gemini API key into GEMINI_API_KEY below. The key is NOT kept in the
 *     repository: it exists only in the editor.
 *  3. Publish as a web app (Deploy -> New deployment) with access set to "Anyone", and copy
 *     the /exec URL into the widget's ENDPOINT.
 *  4. After a change, redeploy: Deploy -> Manage deployments -> edit -> Version: New.
 */

// Your Gemini API key goes here (aistudio.google.com/apikey), in the editor and nowhere else.
const GEMINI_API_KEY = "PEGA_AQUI_TU_API_KEY";
const GEMINI_MODEL = "gemini-flash-latest";

const SHEET_NAME = "Feedback";
const HEADERS = [
  "Fecha",
  "Puntuacion",
  "Comentario",
  "Pagina",
  "Titulo",
  "Idioma",
  "User-Agent",
  "Sentimiento IA",
  "Categoria IA",
];
const CATEGORIES = [
  "Datos/exactitud",
  "Usabilidad",
  "Diseno",
  "Rendimiento",
  "Contenido",
  "Sugerencia",
  "Error/bug",
  "Elogio",
  "Publicidad",
  "Otro",
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const comment = (data.comment || "").trim();

    // 1) Guardar SIEMPRE la fila primero (aunque la IA falle no se pierde nada).
    //    sanitizeCell_ evita inyeccion de formulas; cleanRating_ valida 1-5.
    sheet.appendRow([
      new Date(),
      cleanRating_(data.rating),
      sanitizeCell_(comment),
      sanitizeCell_(data.page),
      sanitizeCell_(data.title),
      sanitizeCell_(data.lang),
      sanitizeCell_(data.userAgent),
      "",
      "",
    ]);
    const row = sheet.getLastRow();

    // 2) Classify it. This never blocks the row from being saved.
    try {
      const result = comment
        ? classify_(comment, data.rating)
        : { sentimiento: ratingToSentiment_(data.rating), categoria: "(sin comentario)" };
      sheet.getRange(row, 8, 1, 2).setValues([[result.sentimiento, result.categoria]]);
    } catch (aiErr) {
      sheet.getRange(row, 8).setValue(String(aiErr).slice(0, 250));
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function classify_(comment, rating) {
  const prompt =
    "Eres un clasificador de opiniones de usuarios de una web espanola de calendario de festivos (elproximofestivo.es). " +
    "Devuelve el sentimiento y la categoria de la siguiente opinion. " +
    "Puntuacion del usuario (1=muy malo, 5=muy bueno): " +
    (rating || "-") +
    ". " +
    'Comentario: "' +
    comment +
    '".';

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          sentimiento: { type: "STRING", enum: ["Positivo", "Neutral", "Negativo"] },
          categoria: { type: "STRING", enum: CATEGORIES },
        },
        required: ["sentimiento", "categoria"],
      },
    },
  };

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL +
    ":generateContent?key=" +
    GEMINI_API_KEY;
  const resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error(
      "Gemini HTTP " + resp.getResponseCode() + ": " + resp.getContentText().slice(0, 120),
    );
  }

  const parsed = JSON.parse(resp.getContentText());
  // Find the part that holds the text: some models put their "thinking" parts first.
  const parts = parsed.candidates[0].content.parts;
  let text = "";
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] && parts[i].text) {
      text = parts[i].text;
      break;
    }
  }
  return JSON.parse(text);
}

function ratingToSentiment_(rating) {
  const r = Number(rating);
  if (r >= 4) return "Positivo";
  if (r <= 2) return "Negativo";
  return "Neutral";
}

// Against formula injection: text starting with = + - @ or a control character gets an
// apostrophe in front, which is what makes Sheets treat it as plain text.
function sanitizeCell_(value) {
  const s = String(value == null ? "" : value);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

// Normaliza la puntuacion a un entero 1-5; si no es valida, deja la celda vacia.
function cleanRating_(rating) {
  const r = Math.round(Number(rating));
  return r >= 1 && r <= 5 ? r : "";
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Run this ONCE from the editor -- pick it in the dropdown and press Run -- to grant the
 * "connect to an external service" permission (UrlFetchApp) and check that Gemini answers.
 * The result appears in the execution log. It can be deleted afterwards: it exists only to
 * authorise and to test.
 */
function autorizar() {
  const r = classify_("La pagina va un poco lenta pero es util", 3);
  Logger.log(r);
  return r;
}

/**
 * Makes the "Feedback" sheet readable: header, filter, a colour per sentiment, banded rows.
 * Run it ONCE from the editor whenever you feel like it. The sentiment colours and the
 * banding are open-ended conditional formatting, so they apply to future rows too.
 */
function formatearHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const lastCol = HEADERS.length; // 9

  // The header, in the site's own palette.
  const header = sheet.getRange(1, 1, 1, lastCol);
  header
    .setBackground("#c4482a")
    .setFontColor("#faf3e2")
    .setFontWeight("bold")
    .setVerticalAlignment("middle");
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 34);

  // Anchos de columna y ajuste de texto en Comentario.
  const widths = [140, 90, 340, 160, 170, 70, 130, 120, 140];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.getRange("C2:C").setWrap(true);
  sheet.getRange(1, 1, sheet.getMaxRows(), lastCol).setVerticalAlignment("middle");

  // Conditional formatting: a colour per sentiment (column H) and open-ended banding.
  const senRange = sheet.getRange("H2:H");
  const bandRange = sheet.getRange("A2:I");
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Positivo")
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setRanges([senRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Negativo")
      .setBackground("#f4cccc")
      .setFontColor("#990000")
      .setRanges([senRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Neutral")
      .setBackground("#fff2cc")
      .setFontColor("#7f6000")
      .setRanges([senRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=ISEVEN(ROW())")
      .setBackground("#fbf5e8")
      .setRanges([bandRange])
      .build(),
  ];
  sheet.setConditionalFormatRules(rules);

  // Filtro en la cabecera.
  const existing = sheet.getFilter();
  if (existing) existing.remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), lastCol).createFilter();
}
