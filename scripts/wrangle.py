"""
Golf Holiday Stats — data wrangling script
Run from project root: py scripts/wrangle.py
Outputs: public/data/golf.json
"""

import json, math, os
import pandas as pd
import numpy as np

XLSX = "Golf Holiday V2.xlsx"
OUT  = os.path.join("public", "data", "golf.json")

# ── Load ──────────────────────────────────────────────────────────────────
holidays   = pd.read_excel(XLSX, sheet_name="Holidays")
matchdays  = pd.read_excel(XLSX, sheet_name="Matchdays")
matches    = pd.read_excel(XLSX, sheet_name="Matches")
green_jkts = pd.read_excel(XLSX, sheet_name="Green Jackets")
players    = pd.read_excel(XLSX, sheet_name="Players")

# ── Clean ─────────────────────────────────────────────────────────────────
def clean_str(df):
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip().replace("nan", "")
    return df

for df in (holidays, matchdays, matches, green_jkts, players):
    clean_str(df)

# Drop blank rows (Excel padding)
matchdays = matchdays[matchdays["event_id"].notna() & (matchdays["event_id"] != "")]
matches   = matches[matches["match_id"].notna() & (matches["match_id"] != "")]

# Fix dates
for df in (matchdays, matches, green_jkts):
    for col in df.columns:
        if col.lower() in ("date",):
            df[col] = pd.to_datetime(df[col], errors="coerce").dt.strftime("%Y-%m-%d")

# Name normalisation
NAME_MAP = {}  # add any spelling variants here if needed

SLOTS = ["a", "b", "c", "d"]

# ── Fix Tie points in source data ─────────────────────────────────────────
# Tie/A/S matches have 0 pts in the sheet — correct to 0.5 per participant
for idx, row in matches.iterrows():
    if str(row["Result"]).strip() == "Tie":
        for s in SLOTS:
            player = str(row.get(f"player_{s}", "")).strip()
            if player and player != "nan":
                matches.at[idx, f"points_{s}"] = 0.5

# ── Build player-match dataframe ──────────────────────────────────────────
# One row per player per match. Partners and opponents are identified
# from the other filled slots in the same match row.

records = []
for _, m in matches.iterrows():
    # Gather all filled slots for this row
    filled = {}
    for s in SLOTS:
        p = NAME_MAP.get(str(m.get(f"player_{s}", "")).strip(),
                         str(m.get(f"player_{s}", "")).strip())
        t = str(m.get(f"team_{s}", "")).strip()
        pts = float(m.get(f"points_{s}", 0) or 0)
        bi  = int(0 if pd.isna(m.get(f"birdie_{s}", 0)) else (m.get(f"birdie_{s}", 0) or 0))
        ci  = int(0 if pd.isna(m.get(f"chip_in_{s}", 0)) else (m.get(f"chip_in_{s}", 0) or 0))
        if p and p != "nan":
            filled[s] = dict(player=p, team=t, pts=pts, birdies=bi, chip_ins=ci)

    for focal_slot, focal in filled.items():
        partners  = [v["player"] for s, v in filled.items()
                     if s != focal_slot and v["team"] == focal["team"]]
        opponents = [v["player"] for s, v in filled.items()
                     if v["team"] != focal["team"] and v["team"] != ""]

        # Derive result label from pts
        pts = focal["pts"]
        fmt = str(m.get("Format", "")).strip()
        if fmt == "Texas Scramble":
            result = f"pos{int(float(m['Result']))}"
        elif pts == 1.0: result = "Win"
        elif pts == 0.5: result = "Halved"
        elif pts == 0.0: result = "Loss"
        else:            result = f"pos{int(m['Result'])}"

        records.append({
            "player":     focal["player"],
            "event_id":   int(m["event_id"]),
            "holiday_id": int(m["holiday_id"]),
            "match_id":   int(m["match_id"]),
            "date":       str(m["Date"]),
            "country":    str(m["Country"]),
            "area":       str(m["Area"]),
            "course":     str(m["Course"]),
            "format":     str(m["Format"]),
            "team":       focal["team"],
            "pts":        pts,
            "result":     result,
            "score":      str(m.get("Score", "")).strip() if fmt != "Texas Scramble" else "",
            "birdies":    focal["birdies"],
            "chip_ins":   focal["chip_ins"],
            "partners":   partners,
            "opponents":  opponents,
        })

pm = pd.DataFrame(records)

# ── Players roster ────────────────────────────────────────────────────────
# Players sheet is the source of truth for full names / attending status.
# Anyone on the roster who hasn't played a match yet (new_2026) still needs
# a leaderboard row so they show up (zeroed out) in the 2026 views.
players_out = [
    {
        "player_id":  int(r["player_id"]),
        "name":       str(r["name"]),
        "first_name": str(r["first_name"]),
        "last_name":  str(r["last_name"]),
        "attending":  int(r["attending"]),
    }
    for _, r in players.iterrows()
]
roster_names  = players["name"].tolist()
roster_pid    = dict(zip(players["name"], players["player_id"]))

all_players = sorted(set(pm["player"].unique()) | set(roster_names))

# Matches link players by name, not player_id. If someone with match history
# gets renamed in the Players sheet (or NAME_MAP) without the old name being
# added to NAME_MAP, the old and new names silently become two different
# leaderboard entries instead of merging. Surface that loudly instead.
orphaned = sorted(set(pm["player"].unique()) - set(roster_names))
if orphaned:
    print(f"WARNING: {len(orphaned)} name(s) appear in Matches but not in the Players sheet — "
          f"they'll show up as separate leaderboard rows: {', '.join(orphaned)}")
    print(f"         If one of these was renamed, add the old name -> new name to NAME_MAP above.")

# ── Format categories ─────────────────────────────────────────────────────
SCRAMBLE_FMTS = {"Texas Scramble"}
PAIRS_FMTS    = {"Fourball", "2x2 Scramble"}
SINGLES_FMTS  = {"Singles"}
KINGPIN_FMTS  = {"Kingpin"}

# ── Leaderboard ───────────────────────────────────────────────────────────
ld_counts   = holidays["long_drive"].value_counts().to_dict()
np_counts   = holidays["nearest_pin"].value_counts().to_dict()
dotd_counts = matchdays[matchdays["DOTD"] != ""]["DOTD"].value_counts().to_dict()

# Pre-aggregate GJ birdies per player (before leaderboard loop, green_jkts loaded below but birdies col is already available)
gj_birdie_counts = (
    green_jkts[green_jkts["birdies"].notna()]
    .assign(birdies=lambda d: d["birdies"].astype(int))
    .groupby("player")["birdies"].sum().to_dict()
)

def wlt(rows):
    w = (rows["result"] == "Win").sum()
    l = (rows["result"] == "Loss").sum()
    t = (rows["result"] == "Halved").sum()
    return f"{w}/{l} ({t} ties)"

def scramble_pos(rows):
    counts = {1:0, 2:0, 3:0, 4:0}
    for r in rows["result"]:
        if str(r).startswith("pos"):
            try: counts[min(int(r[3:]), 4)] += 1
            except ValueError: pass
    return f"{counts[1]}/{counts[2]}/{counts[3]}/{counts[4]}"

# ── Advanced per-player stats ──────────────────────────────────────────────
# Birdies / chip-ins faced (opponents' stats in your matches)
birdies_faced_map  = {}
chip_ins_faced_map = {}
for player in all_players:
    mask = pm["opponents"].apply(lambda ops: player in ops)
    birdies_faced_map[player]  = int(pm[mask]["birdies"].sum())
    chip_ins_faced_map[player] = int(pm[mask]["chip_ins"].sum())

def longest_win_streak(rows):
    h2h = rows[rows["format"] != "Texas Scramble"].sort_values("date")
    streak = best = 0
    for r in h2h["result"]:
        if r == "Win":
            streak += 1
            best = max(best, streak)
        else:
            streak = 0
    return best

# Holiday MVPs (player with most pts per trip; ties shared)
holiday_total = pm.groupby(["holiday_id", "player"])["pts"].sum().reset_index()
holiday_mvp_counts = {}
holiday_mvp_list   = []
for hid in sorted(holiday_total["holiday_id"].unique()):
    h        = holiday_total[holiday_total["holiday_id"] == hid]
    best_pts = float(h["pts"].max())
    mvps     = h[h["pts"] == best_pts]["player"].tolist()
    hol_row  = holidays[holidays["holiday_id"] == hid]
    for mvp in mvps:
        holiday_mvp_counts[mvp] = holiday_mvp_counts.get(mvp, 0) + 1
    holiday_mvp_list.append({
        "holiday_id": int(hid),
        "players":    mvps,
        "pts":        round(best_pts, 3),
        "country":    hol_row.iloc[0]["Country"] if not hol_row.empty else "",
        "area":       hol_row.iloc[0]["Area"]    if not hol_row.empty else "",
    })

leaderboard = []
for player in all_players:
    p = pm[pm["player"] == player]
    pts  = round(float(p["pts"].sum()), 3)
    n    = len(p)
    ppg  = round(pts / n, 3) if n > 0 else 0.0
    team = p["team"].mode()[0] if len(p) > 0 else ""

    def fmt_pts(rows): return round(float(rows["pts"].sum()), 3)
    def fmt_n(rows):   return len(rows)

    p_scr = p[p["format"].isin(SCRAMBLE_FMTS)]
    p_fb  = p[p["format"] == "Fourball"]
    p_2x2 = p[p["format"] == "2x2 Scramble"]
    p_sin = p[p["format"].isin(SINGLES_FMTS)]
    p_kp  = p[p["format"].isin(KINGPIN_FMTS)]

    leaderboard.append({
        "player":          player,
        "team":            team,
        "apps":            int(p["holiday_id"].nunique()),
        "total_pts":       pts,
        "total_matches":   n,
        "ppg":             ppg,
        "scramble_pts":    fmt_pts(p_scr),
        "scramble_n":      fmt_n(p_scr),
        "scramble_record": scramble_pos(p_scr),
        "fourball_pts":    fmt_pts(p_fb),
        "fourball_n":      fmt_n(p_fb),
        "fourball_record": wlt(p_fb),
        "twoxtwo_pts":     fmt_pts(p_2x2),
        "twoxtwo_n":       fmt_n(p_2x2),
        "twoxtwo_record":  wlt(p_2x2),
        "singles_pts":     fmt_pts(p_sin),
        "singles_n":       fmt_n(p_sin),
        "singles_record":  wlt(p_sin),
        "kingpin_pts":     fmt_pts(p_kp),
        "kingpin_n":       fmt_n(p_kp),
        "kingpin_record":  wlt(p_kp),
        "pairs_record":    wlt(p[p["format"].isin(PAIRS_FMTS)]),
        "birdies":         int(p["birdies"].sum()) + int(gj_birdie_counts.get(player, 0)),
        "chip_ins":        int(p["chip_ins"].sum()),
        "long_drive":      int(ld_counts.get(player, 0)),
        "near_pin":        int(np_counts.get(player, 0)),
        "dotd":            int(dotd_counts.get(player, 0)),
        "birdies_faced":   birdies_faced_map.get(player, 0),
        "chip_ins_faced":  chip_ins_faced_map.get(player, 0),
        "win_streak":      longest_win_streak(p),
        "holiday_wins":    holiday_mvp_counts.get(player, 0),
    })

ranked   = [r for r in leaderboard if r["total_matches"] > 0]
unranked = [r for r in leaderboard if r["total_matches"] == 0]

ranked.sort(key=lambda r: -r["total_pts"])
prev_pts = prev_rank = None
for i, row in enumerate(ranked):
    if row["total_pts"] != prev_pts:
        prev_rank = i + 1
        prev_pts  = row["total_pts"]
    row["rank"] = prev_rank

unranked.sort(key=lambda r: roster_pid.get(r["player"], 9999))
for row in unranked:
    row["rank"] = 999
    row["new_2026"] = True

leaderboard = ranked + unranked

# ── Rivalry ───────────────────────────────────────────────────────────────
# Texas Scramble: sum all player pts per team (each player's pts reflects their
# sub-team's finish and the total is the correct team score).
# Head-to-head: deduplicate to one row per (match, team) since all team members
# share the same pts and summing would double-count.
pm_scram = pm[pm["format"] == "Texas Scramble"]
pm_hth   = pm[pm["format"] != "Texas Scramble"]

scram_pts = pm_scram.groupby(["holiday_id", "team"])["pts"].sum().reset_index()
hth_pts   = (
    pm_hth.drop_duplicates(subset=["holiday_id", "match_id", "team"])
          .groupby(["holiday_id", "team"])["pts"]
          .sum().reset_index()
)
team_pts = (
    pd.concat([scram_pts, hth_pts])
      .groupby(["holiday_id", "team"])["pts"]
      .sum().reset_index()
)

rivalry = []
for hid, grp in team_pts.groupby("holiday_id"):
    hol = holidays[holidays["holiday_id"] == hid]
    e_pts = float(grp[grp["team"] == "Europe"]["pts"].sum())
    u_pts = float(grp[grp["team"] == "USA"]["pts"].sum())
    rivalry.append({
        "holiday_id": int(hid),
        "country":    hol.iloc[0]["Country"] if not hol.empty else "",
        "area":       hol.iloc[0]["Area"]    if not hol.empty else "",
        "europe_pts": round(e_pts, 2),
        "usa_pts":    round(u_pts, 2),
        "winner":     "Europe" if e_pts > u_pts else ("USA" if u_pts > e_pts else "Tie"),
    })

# ── Day-by-day rivalry ────────────────────────────────────────────────────
scram_day = pm_scram.groupby(["date", "team"])["pts"].sum().reset_index()
hth_day   = (
    pm_hth.drop_duplicates(subset=["match_id", "team"])
          .groupby(["date", "team"])["pts"].sum().reset_index()
)
day_pts_df = (
    pd.concat([scram_day, hth_day])
      .groupby(["date", "team"])["pts"].sum().reset_index()
)

rivalry_by_day = []
for date in sorted(day_pts_df["date"].unique()):
    grp   = day_pts_df[day_pts_df["date"] == date]
    e_pts = float(grp[grp["team"] == "Europe"]["pts"].sum())
    u_pts = float(grp[grp["team"] == "USA"]["pts"].sum())
    hid   = int(pm[pm["date"] == date]["holiday_id"].iloc[0]) if len(pm[pm["date"] == date]) > 0 else None
    rivalry_by_day.append({
        "date":       date,
        "holiday_id": hid,
        "europe_pts": round(e_pts, 2),
        "usa_pts":    round(u_pts, 2),
    })

# ── Rivalry by format ────────────────────────────────────────────────────
FORMAT_ORDER = ["Texas Scramble", "Fourball", "2x2 Scramble", "Singles", "Kingpin"]
rivalry_by_format = []
for fmt in FORMAT_ORDER:
    sub = pm[pm["format"] == fmt]
    if len(sub) == 0:
        continue
    if fmt == "Texas Scramble":
        pts_grp = sub.groupby("team")["pts"].sum().reset_index()
    else:
        pts_grp = (
            sub.drop_duplicates(subset=["match_id", "team"])
               .groupby("team")["pts"].sum().reset_index()
        )
    e_pts = float(pts_grp[pts_grp["team"] == "Europe"]["pts"].sum())
    u_pts = float(pts_grp[pts_grp["team"] == "USA"]["pts"].sum())
    rivalry_by_format.append({
        "format":     fmt,
        "europe_pts": round(e_pts, 2),
        "usa_pts":    round(u_pts, 2),
    })

# ── Awards ────────────────────────────────────────────────────────────────
awards = []
for _, h in holidays.iterrows():
    hid  = int(h["holiday_id"])
    days = matchdays[(matchdays["holiday_id"] == str(hid)) |
                     (matchdays["holiday_id"] == hid)]
    days = days[days["DOTD"].notna() & (days["DOTD"] != "")][
        ["Date", "Course", "DOTD", "Description"]
    ].copy()
    awards.append({
        "holiday_id": hid,
        "country":    str(h["Country"]),
        "area":       str(h["Area"]),
        "long_drive": str(h["long_drive"]),
        "near_pin":   str(h["nearest_pin"]),
        "matchdays":  days.to_dict(orient="records"),
    })

# ── Green Jackets ─────────────────────────────────────────────────────────
green_jkts["date"] = pd.to_datetime(green_jkts["date"], errors="coerce").dt.strftime("%Y-%m-%d")
gj_out = green_jkts.to_dict(orient="records")

# ── Green Jacket birdies (aggregated per player+holiday for merging) ───────
gj_birdies = (
    green_jkts[green_jkts["birdies"].notna()]
    .assign(birdies=lambda d: d["birdies"].astype(int))
    .groupby(["holiday_id", "player"])["birdies"]
    .sum().reset_index()
    .rename(columns={"birdies": "gj_birdies"})
)

# ── Birdies per player per holiday (matches + green jacket rounds) ─────────
match_birdies = (
    pm.groupby(["holiday_id", "player"])["birdies"]
      .sum().reset_index()
)
birdie_merged = match_birdies.merge(gj_birdies, on=["holiday_id", "player"], how="left")
birdie_merged["gj_birdies"] = birdie_merged["gj_birdies"].fillna(0).astype(int)
birdie_merged["birdies"] = birdie_merged["birdies"] + birdie_merged["gj_birdies"]
birdie_out = birdie_merged[["holiday_id", "player", "birdies"]].to_dict(orient="records")

# ── Holidays ──────────────────────────────────────────────────────────────
holidays_out = holidays.to_dict(orient="records")

# ── Write ─────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT), exist_ok=True)

pm_json = pm[[
    "player","event_id","holiday_id","match_id","date","country","area",
    "course","format","team","pts","result","score","birdies","chip_ins",
    "partners","opponents"
]].to_dict(orient="records")

output = {
    "holidays":          holidays_out,
    "rivalry":           rivalry,
    "leaderboard":       leaderboard,
    "player_matches":    pm_json,
    "green_jackets":     gj_out,
    "awards":            awards,
    "birdie_by_holiday": birdie_out,
    "holiday_mvp":       holiday_mvp_list,
    "rivalry_by_day":    rivalry_by_day,
    "rivalry_by_format": rivalry_by_format,
    "players":           players_out,
}

def sanitize(obj):
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj

with open(OUT, "w") as f:
    json.dump(sanitize(output), f, indent=2, default=str)

print(f"Written {OUT}")
print(f"  players:         {len(all_players)}")
print(f"  player_matches:  {len(pm_json)} rows")
print(f"  leaderboard:     {len(leaderboard)} players")
print(f"  rivalry:         {len(rivalry)} holidays")
print()
print("Top 5:")
for r in leaderboard[:5]:
    print(f"  #{r['rank']} {r['player']:12} {r['total_pts']:.3f} pts  "
          f"PPG {r['ppg']:.3f}  ({r['total_matches']} matches)")
print()
print("Rivalry:")
for r in rivalry:
    print(f"  H{r['holiday_id']} {r['country']:10} EUR {r['europe_pts']} - USA {r['usa_pts']}  => {r['winner']}")
