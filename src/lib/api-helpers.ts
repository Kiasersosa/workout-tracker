import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getOrCreateSpreadsheet } from "@/lib/sheets";

/** Get access token and spreadsheet ID, or return an error response */
export async function getAuthContext(): Promise<
  | { accessToken: string; spreadsheetId: string }
  | NextResponse
> {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spreadsheetId = await getOrCreateSpreadsheet(session.accessToken);
    return { accessToken: session.accessToken, spreadsheetId };
  } catch (error) {
    console.error("Sheets auth error:", error);
    return NextResponse.json(
      { error: "Failed to access Google Sheets" },
      { status: 500 }
    );
  }
}

export function isErrorResponse(
  result: { accessToken: string; spreadsheetId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
