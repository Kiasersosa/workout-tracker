import { google, type sheets_v4 } from "googleapis";

const SPREADSHEET_TITLE = "Workout Tracker Data";

const TAB_CONFIGS = {
  "Workout Log": [
    "workout_id", "date", "exercise_name", "muscle_group", "set_number",
    "target_reps", "target_weight", "actual_reps", "actual_weight", "rpe", "notes", "synced_at",
  ],
  "Routines": [
    "routine_id", "created_date", "workout_number", "exercise_order", "exercise_name",
    "target_sets", "target_reps", "target_weight", "progression_note", "ai_rationale",
  ],
  "Body Measurements": [
    "date", "body_weight", "chest", "waist", "hips",
    "left_bicep", "right_bicep", "left_thigh", "right_thigh", "neck",
  ],
  "Goals": [
    "goal_id", "exercise_name", "metric", "current_value", "target_value",
    "start_date", "target_date", "status",
  ],
  "Exercise Library": [
    "exercise_name", "muscle_group", "equipment", "movement_type", "difficulty",
    "strength_standard_coefficient",
  ],
} as const;

type TabName = keyof typeof TAB_CONFIGS;

/** Create an authenticated Sheets client from an OAuth access token */
function getSheetsClient(accessToken: string): sheets_v4.Sheets {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

/** Find the user's Workout Tracker spreadsheet, or return null */
async function findSpreadsheet(accessToken: string): Promise<string | null> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  return res.data.files?.[0]?.id ?? null;
}

/** Create the spreadsheet with all 5 tabs and headers */
async function createSpreadsheet(accessToken: string): Promise<string> {
  const sheets = getSheetsClient(accessToken);

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SPREADSHEET_TITLE },
      sheets: Object.entries(TAB_CONFIGS).map(([title, headers]) => ({
        properties: { title },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headers.map((h) => ({
                  userEnteredValue: { stringValue: h },
                  userEnteredFormat: { textFormat: { bold: true } },
                })),
              },
            ],
          },
        ],
      })),
    },
  });

  return res.data.spreadsheetId!;
}

/** Get or create the spreadsheet, returning its ID */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<string> {
  const existing = await findSpreadsheet(accessToken);
  if (existing) return existing;
  return createSpreadsheet(accessToken);
}

/** Append rows to a tab */
export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  tab: TabName,
  rows: (string | number | null)[][]
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tab}'!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

/** Read all rows from a tab (excluding header) */
export async function readRows(
  accessToken: string,
  spreadsheetId: string,
  tab: TabName
): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tab}'!A:Z`,
  });

  const values = res.data.values ?? [];
  // Skip header row
  return values.slice(1);
}

/** Read rows with headers as objects */
export async function readRowsAsObjects(
  accessToken: string,
  spreadsheetId: string,
  tab: TabName
): Promise<Record<string, string>[]> {
  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tab}'!A:Z`,
  });

  const values = res.data.values ?? [];
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

/** Overwrite a tab (clear + write headers + new data) */
export async function overwriteTab(
  accessToken: string,
  spreadsheetId: string,
  tab: TabName,
  rows: (string | number | null)[][]
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  const headers = TAB_CONFIGS[tab] as unknown as string[];

  // Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${tab}'!A:Z`,
  });

  // Write headers + new data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tab}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...rows],
    },
  });
}

export { TAB_CONFIGS, type TabName };
