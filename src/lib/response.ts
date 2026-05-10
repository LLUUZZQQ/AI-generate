import { NextResponse } from "next/server";

export function success(data: any, message = "ok") {
  return NextResponse.json({ code: 0, data, message });
}

export function error(code: number, message: string, status = 400) {
  return NextResponse.json({ code, data: null, message }, { status });
}

export function paginated(list: any[], total: number, page: number, pageSize: number) {
  return NextResponse.json({ code: 0, data: { list, total, page, pageSize } });
}
