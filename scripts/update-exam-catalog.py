#!/usr/bin/env python3
"""Build the recent three-year high-school math exam catalog from EBSi."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

AJAX_URL = "https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperListAjax.ajax"
DOWNLOAD_PREFIX = "https://wdown.ebsi.co.kr/W61001/01exam"
MONTHS = ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
KIND_NAMES = {"P": "problem", "J": "answer", "J2": "answer", "H": "solution"}


def clean(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def request(url: str, data: bytes | None = None, referer: str | None = None) -> bytes:
    headers = {"User-Agent": "Mozilla/5.0"}
    if referer:
        headers["Referer"] = referer
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        headers["X-Requested-With"] = "XMLHttpRequest"
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=60) as response:
        return response.read()


def decode(data: bytes) -> str:
    for encoding in ("utf-8", "cp949", "euc-kr"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            pass
    return data.decode("utf-8", errors="replace")


def source_url(value: str) -> str:
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return DOWNLOAD_PREFIX + value if value.startswith("/") else value


def title_of(block: str) -> str:
    match = re.search(r'<div class="qus_tit">(.*?)</div>', block, re.S)
    return clean(match.group(1)) if match else ""


def exam_name(title: str) -> str:
    value = re.sub(r"^고[123]\s*", "", title)
    value = re.sub(r"\s*(수학|확률과 통계|미적분|기하)\s*$", "", value).strip()
    if "수능" in value:
        return "대학수학능력시험"
    if "모평" in value or "모의평가" in value:
        return "대학수학능력시험 모의평가"
    if "학평" in value or "전국연합" in value:
        office = re.search(r"\(([^)]+)\)", value)
        return f"전국연합학력평가 · {office.group(1)}" if office else "전국연합학력평가"
    return value or "수학 시험"


def extension(data: bytes) -> str | None:
    if data.startswith(b"%PDF"):
        return "pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8"):
        return "jpg"
    return None


def post_data(target: str, years: list[int], subject_id: str) -> bytes:
    fields = [
        ("targetCd", target),
        ("yearList", ",".join(map(str, years))),
        ("monthList", ",".join(MONTHS)),
        ("arOrd", "2"),
        ("subjIdList", subject_id),
        ("sort", "recent"),
        ("paperId", ""),
        ("paperNo", ""),
        ("lvl", ""),
        ("mathArOrd", "2"),
        ("sFormPartMath", subject_id),
        ("yearAll", "all"),
    ]
    fields.extend(("year", str(year)) for year in years)
    fields.extend(("month", month) for month in MONTHS)
    return urllib.parse.urlencode(fields).encode("utf-8")


def parse_grade(page: str, grade: str, years: set[int], subject_id: str, subject_label: str) -> list[dict]:
    blocks = re.findall(r'<div class="qus_box\b.*?(?=<div class="qus_box\b|<!-- //board_list -->)', page, re.S)
    calls = re.compile(r"goDownLoad(J2|[PJH])\((.*?)\);", re.S)
    exams: dict[tuple[str, str], dict] = {}
    for block in blocks:
        title = title_of(block)
        if not re.search(rf"고\s*{grade}\b", title):
            continue
        for code, raw_args in calls.findall(block):
            args = re.findall(r"'([^']*)'", raw_args)
            if not args:
                continue
            if len(args) > 5 and args[5] and args[5] != subject_id:
                continue
            url = source_url(args[0])
            date_match = re.search(r"/(20\d{6})/", url)
            if not date_match:
                continue
            date = date_match.group(1)
            year, month = int(date[:4]), date[4:6]
            if year not in years:
                continue
            name = exam_name(title)
            key = (date, name)
            item = exams.setdefault(key, {
                "id": f"ebsi-{grade}-{date}",
                "grade": grade,
                "examYear": str(year),
                "examMonth": str(int(month)),
                "examDate": f"{date[:4]}-{date[4:6]}-{date[6:]}",
                "examName": name,
                "title": re.sub(r"\s*(수학|확률과 통계|미적분|기하)\s*$", "", title),
                "subject": "수학",
                "kind": "모의고사",
                "source": "EBSi",
                "sourcePage": f"https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D{grade}00",
                "sets": [],
            })
            subject_set = next((row for row in item["sets"] if row["subject"] == subject_label), None)
            if subject_set is None:
                subject_set = {"subject": subject_label, "files": {}}
                item["sets"].append(subject_set)
            subject_set["files"].setdefault(KIND_NAMES[code], {"url": url})
    return sorted(exams.values(), key=lambda row: (row["examDate"], row["title"]), reverse=True)


def verify(catalog: list[dict], pause: float) -> dict:
    checked = failed = 0
    total_bytes = 0
    for exam in catalog:
        for subject_set in exam["sets"]:
            for file in subject_set["files"].values():
                data = request(file["url"], referer=exam["sourcePage"])
                detected = extension(data)
                file.update({
                    "format": detected,
                    "size": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "verified": bool(detected and len(data) > 1024),
                })
                checked += 1
                total_bytes += len(data)
                if not file["verified"]:
                    failed += 1
                time.sleep(pause)
    return {"checked": checked, "failed": failed, "totalBytes": total_bytes}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", help="Calendar years, e.g. 2024-2026")
    parser.add_argument("--out", default="assets/exam-catalog.json")
    parser.add_argument("--skip-verify", action="store_true")
    parser.add_argument("--pause", type=float, default=0.08)
    args = parser.parse_args()
    current_year = datetime.now().year
    if args.years:
        start, end = map(int, args.years.split("-", 1))
    else:
        start, end = current_year - 2, current_year
    years = list(range(start, end + 1))

    raw_dir = Path(".exam-source-cache")
    raw_dir.mkdir(parents=True, exist_ok=True)
    subjects = {
        "1": [("110001", "수학")],
        "2": [("140111", "수학")],
        "3": [("140119", "확률과 통계"), ("140120", "미적분"), ("140121", "기하")],
    }
    grouped: dict[tuple[str, str, str], dict] = {}
    for grade in ("1", "2", "3"):
        target = f"D{grade}00"
        referer = f"https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd={target}"
        for subject_id, subject_label in subjects[grade]:
            for year in years:
                page = decode(request(AJAX_URL, post_data(target, [year], subject_id), referer))
                (raw_dir / f"ebsi-{grade}-{subject_id}-{year}.html").write_text(page, encoding="utf-8")
                for item in parse_grade(page, grade, {year}, subject_id, subject_label):
                    key = (grade, item["examDate"], item["examName"])
                    if key not in grouped:
                        grouped[key] = item
                    else:
                        grouped[key]["sets"].extend(item["sets"])
    catalog = sorted(grouped.values(), key=lambda row: (row["examDate"], row["grade"]), reverse=True)

    verification = {"checked": 0, "failed": 0, "totalBytes": 0}
    if not args.skip_verify:
        verification = verify(catalog, args.pause)

    payload = {
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "years": years,
        "source": "EBSi 기출문제",
        "sourceUrl": "https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D300",
        "verification": verification,
        "count": len(catalog),
        "items": catalog,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"exams={len(catalog)} files={verification['checked']} failed={verification['failed']} out={out}")
    return 1 if verification["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

