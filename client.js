/**
 * Liquid Glass Schedule — Client half.
 *
 * A floating, draggable schedule in the frame-wide `shell.overlay` seat.
 *   - three sizes: an orb, a collapsed pill, and the expanded panel;
 *   - free resize by the corner grip plus three size presets;
 *   - every entry is either 工作/work (purple) or 个人/personal (blue): the
 *     category owns the card accent, the badge dot and the timeline lane;
 *   - each entry can carry a time range (start / end), shown as a badge, as a
 *     two-lane 24-hour timeline strip for a chosen day, and as day groups;
 *   - Apple "Liquid Glass" material in its black variant: frosted blur, a dark
 *     tinted translucent body, a specular rim and a soft sheen. The material is
 *     intentionally dark in both host themes, so it uses this plugin's own
 *     palette rather than the `--dsw-alias-*` light/dark tokens.
 *
 * Entries and panel geometry persist in client-local storage. The Host half is
 * a no-op: nothing here touches the session log, tools or the network.
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-glass-notepad',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const PKG = 'dsh-plugin-glass-notepad';
    const SLOT = 'shell.overlay';
    const SLOT_ORDER = 120;
    const STORE_KEY = 'dsh-plugin-glass-notepad/state.v1';
    const MIN_W = 268;
    const MAX_W = 620;
    /* The header (title + date + lunar lines), the toolbar and the timeline are
       fixed chrome of roughly 234px. The floor has to leave the scrolling list
       some room, otherwise a short panel shows no entries at all. */
    const MIN_H = 320;
    const MAX_H = 760;
    const EDGE = 8;
    const DAY_MS = 86400000;

    /* ------------------------------------------------------------------ text */

    const DICT = {
      zh: {
        title: '日程',
        newNote: '新建日程',
        placeholder: '记录这条日程…',
        empty: '还没有日程。新建一条，选好工作或个人，再标注时间范围。',
        collapse: '收起',
        expand: '展开',
        orb: '缩到小球',
        orbOpen: '打开日程',
        orbHint: '打开日程（可拖动）',
        pillHint: '展开日程（可拖动）',
        resizeHint: '拖动调整宽高',
        resizeWidth: '左右拖动调整宽度',
        resizeHeight: '上下拖动调整高度',
        preset: '切换尺寸',
        presetMedium: '中',
        presetLarge: '大',
        timelineOn: '隐藏时间轴',
        timelineOff: '显示时间轴',
        timelineLabel: '时间轴',
        emptyDay: '这一天没有日程。点「+」新建，或切到「全部」查看其它日期。',
        kindLabel: '类型',
        kindWork: '工作',
        kindPersonal: '个人',
        kindSwitch: '点击展开选择：工作 / 个人',
        kindCollapse: '收起类型选择',
        kindWorkHint: '标记为工作（紫色）',
        kindPersonalHint: '标记为个人（蓝色）',
        markRange: '标注时间范围',
        editRange: '修改时间',
        closeRange: '收起时间编辑',
        clearRange: '清除时间',
        timelineEmpty: '这一天没有标注',
        start: '开始',
        end: '结束',
        quickNow: '现在',
        quickHour: '+1 小时',
        quickToday: '今天 09:00–18:00',
        delete: '删除',
        untimed: '未标注时间',
        completed: '已完成',
        noPending: '没有未完成的日程',
        untitled: '（未填写内容）',
        nextHint: '最近未完成',
        sortDoneAsc: '已完成排序：从早到晚',
        sortDoneDesc: '已完成排序：从晚到早',
        running: '进行中',
        upcoming: '待开始',
        ended: '已结束',
        point: '时刻',
        count: '条',
        prevDay: '前一天',
        nextDay: '后一天',
        today: '今天',
        tomorrow: '明天',
        yesterday: '昨天',
        minutes: '分钟',
        hours: '小时',
        days: '天',
        clearAll: '清空',
        clearAllConfirm: '确认清空',
        dragHint: '拖动移动 · 右下角缩放',
        noEnd: '未设置结束',
        focus: '定位',
        holidayOff: '休',
        holidayWork: '班',
        weekend: '周末',
        holidayFrom: '数据来源：国务院办公厅节假日通知（holiday-cn 汇总）',
        holidaySynced: '已从网络同步最新节假日数据',
        holidayBuiltin: '使用内置节假日数据（未联网同步）',
        solarTerm: '节气',
        nextTerm: '下个节气',
      },
      en: {
        title: 'Schedule',
        newNote: 'New entry',
        placeholder: 'Write this entry…',
        empty: 'No entries yet. Add one, pick work or personal, then annotate its time range.',
        collapse: 'Collapse',
        expand: 'Expand',
        orb: 'Shrink to orb',
        orbOpen: 'Open schedule',
        orbHint: 'Open schedule (drag to move)',
        pillHint: 'Expand schedule (drag to move)',
        resizeHint: 'Drag to resize',
        resizeWidth: 'Drag sideways to change the width',
        resizeHeight: 'Drag up or down to change the height',
        preset: 'Cycle size',
        presetMedium: 'M',
        presetLarge: 'L',
        timelineOn: 'Hide timeline',
        timelineOff: 'Show timeline',
        timelineLabel: 'Timeline',
        emptyDay: 'Nothing scheduled for this day. Add one, or switch to “All days”.',
        kindLabel: 'Type',
        kindWork: 'Work',
        kindPersonal: 'Personal',
        kindSwitch: 'Click to choose: work / personal',
        kindCollapse: 'Hide type options',
        kindWorkHint: 'Mark as work (purple)',
        kindPersonalHint: 'Mark as personal (blue)',
        markRange: 'Annotate time range',
        editRange: 'Edit time',
        closeRange: 'Hide time editor',
        clearRange: 'Clear time',
        timelineEmpty: 'Nothing annotated for this day',
        start: 'Start',
        end: 'End',
        quickNow: 'Now',
        quickHour: '+1 hour',
        quickToday: 'Today 09:00–18:00',
        delete: 'Delete',
        untimed: 'No time range',
        completed: 'Completed',
        noPending: 'Nothing pending',
        untitled: '(no text)',
        nextHint: 'Next up',
        sortDoneAsc: 'Completed order: earliest first',
        sortDoneDesc: 'Completed order: latest first',
        running: 'In progress',
        upcoming: 'Upcoming',
        ended: 'Ended',
        point: 'Instant',
        count: 'entries',
        prevDay: 'Previous day',
        nextDay: 'Next day',
        today: 'Today',
        tomorrow: 'Tomorrow',
        yesterday: 'Yesterday',
        minutes: 'min',
        hours: 'h',
        days: 'd',
        clearAll: 'Clear',
        clearAllConfirm: 'Confirm clear',
        dragHint: 'Drag to move · resize from the corner',
        noEnd: 'No end set',
        focus: 'Focus',
        holidayOff: 'off',
        holidayWork: 'work',
        weekend: 'Weekend',
        holidayFrom: 'Source: State Council holiday notices (mirrored by holiday-cn)',
        holidaySynced: 'Holiday data synced from the network',
        holidayBuiltin: 'Using the built-in holiday table (no network sync)',
        solarTerm: 'Solar term',
        nextTerm: 'Next term',
      },
    };

    function pickLang(active) {
      return String(active || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }

    function translate(lang, key) {
      const table = DICT[lang] || DICT.en;
      return table[key] !== undefined ? table[key] : DICT.en[key] !== undefined ? DICT.en[key] : key;
    }

    /* ------------------------------------------------------------- utilities */

    /* Chinese mainland public holidays and make-up workdays, transcribed from
       the State Council notices (the same data the holiday-cn project mirrors:
       gov.cn 2023/2024/2025 announcements). `1` = 放假, `0` = 调休上班. Years the
       notices do not cover yet stay empty here and are filled in by the
       best-effort network sync below. */
    const HOLIDAYS_BUILTIN = {
      2024: [
        ['01-01', '元旦', 1],
        ['02-04', '春节', 0], ['02-10', '春节', 1], ['02-11', '春节', 1], ['02-12', '春节', 1],
        ['02-13', '春节', 1], ['02-14', '春节', 1], ['02-15', '春节', 1], ['02-16', '春节', 1],
        ['02-17', '春节', 1], ['02-18', '春节', 0],
        ['04-04', '清明节', 1], ['04-05', '清明节', 1], ['04-06', '清明节', 1], ['04-07', '清明节', 0],
        ['04-28', '劳动节', 0], ['05-01', '劳动节', 1], ['05-02', '劳动节', 1], ['05-03', '劳动节', 1],
        ['05-04', '劳动节', 1], ['05-05', '劳动节', 1], ['05-11', '劳动节', 0],
        ['06-10', '端午节', 1],
        ['09-14', '中秋节', 0], ['09-15', '中秋节', 1], ['09-16', '中秋节', 1], ['09-17', '中秋节', 1],
        ['09-29', '国庆节', 0], ['10-01', '国庆节', 1], ['10-02', '国庆节', 1], ['10-03', '国庆节', 1],
        ['10-04', '国庆节', 1], ['10-05', '国庆节', 1], ['10-06', '国庆节', 1], ['10-07', '国庆节', 1],
        ['10-12', '国庆节', 0],
      ],
      2025: [
        ['01-01', '元旦', 1],
        ['01-26', '春节', 0], ['01-28', '春节', 1], ['01-29', '春节', 1], ['01-30', '春节', 1],
        ['01-31', '春节', 1], ['02-01', '春节', 1], ['02-02', '春节', 1], ['02-03', '春节', 1],
        ['02-04', '春节', 1], ['02-08', '春节', 0],
        ['04-04', '清明节', 1], ['04-05', '清明节', 1], ['04-06', '清明节', 1],
        ['04-27', '劳动节', 0], ['05-01', '劳动节', 1], ['05-02', '劳动节', 1], ['05-03', '劳动节', 1],
        ['05-04', '劳动节', 1], ['05-05', '劳动节', 1],
        ['05-31', '端午节', 1], ['06-01', '端午节', 1], ['06-02', '端午节', 1],
        ['09-28', '国庆节、中秋节', 0], ['10-01', '国庆节、中秋节', 1], ['10-02', '国庆节、中秋节', 1],
        ['10-03', '国庆节、中秋节', 1], ['10-04', '国庆节、中秋节', 1], ['10-05', '国庆节、中秋节', 1],
        ['10-06', '国庆节、中秋节', 1], ['10-07', '国庆节、中秋节', 1], ['10-08', '国庆节、中秋节', 1],
        ['10-11', '国庆节、中秋节', 0],
      ],
      2026: [
        ['01-01', '元旦', 1], ['01-02', '元旦', 1], ['01-03', '元旦', 1], ['01-04', '元旦', 0],
        ['02-14', '春节', 0], ['02-15', '春节', 1], ['02-16', '春节', 1], ['02-17', '春节', 1],
        ['02-18', '春节', 1], ['02-19', '春节', 1], ['02-20', '春节', 1], ['02-21', '春节', 1],
        ['02-22', '春节', 1], ['02-23', '春节', 1], ['02-28', '春节', 0],
        ['04-04', '清明节', 1], ['04-05', '清明节', 1], ['04-06', '清明节', 1],
        ['05-01', '劳动节', 1], ['05-02', '劳动节', 1], ['05-03', '劳动节', 1], ['05-04', '劳动节', 1],
        ['05-05', '劳动节', 1], ['05-09', '劳动节', 0],
        ['06-19', '端午节', 1], ['06-20', '端午节', 1], ['06-21', '端午节', 1],
        ['09-20', '国庆节', 0], ['09-25', '中秋节', 1], ['09-26', '中秋节', 1], ['09-27', '中秋节', 1],
        ['10-01', '国庆节', 1], ['10-02', '国庆节', 1], ['10-03', '国庆节', 1], ['10-04', '国庆节', 1],
        ['10-05', '国庆节', 1], ['10-06', '国庆节', 1], ['10-07', '国庆节', 1], ['10-10', '国庆节', 0],
      ],
    };

    const HOLIDAY_CACHE_KEY = 'dsh-plugin-glass-notepad/holidays.v1';
    const HOLIDAY_REFRESH_MS = 30 * 24 * 3600 * 1000;
    const HOLIDAY_BASE = 'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/';

    /* key -> [name, off]; built once from the embedded table, then upgraded by
       whatever the sync managed to fetch. */
    const holidayMap = new Map();
    Object.keys(HOLIDAYS_BUILTIN).forEach((year) => {
      HOLIDAYS_BUILTIN[year].forEach(([md, name, off]) => holidayMap.set(`${year}-${md}`, [name, off === 1]));
    });
    let holidaySyncedAt = 0;
    const holidayYears = new Set(Object.keys(HOLIDAYS_BUILTIN));

    function holidayOf(date) {
      return holidayMap.get(dayKey(date)) || null;
    }

    function loadHolidayCache() {
      try {
        const raw = window.localStorage.getItem(HOLIDAY_CACHE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.days) return;
        Object.keys(parsed.days).forEach((key) => {
          const entry = parsed.days[key];
          if (Array.isArray(entry) && typeof entry[0] === 'string') {
            holidayMap.set(key, [entry[0], entry[1] === true]);
            holidayYears.add(key.slice(0, 4));
          }
        });
        holidaySyncedAt = Number(parsed.fetchedAt) || 0;
      } catch (error) {
        /* a broken cache just means the embedded table is used */
      }
    }

    function saveHolidayCache() {
      try {
        const days = {};
        holidayMap.forEach((value, key) => {
          days[key] = value;
        });
        window.localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify({ fetchedAt: holidaySyncedAt, days }));
      } catch (error) {
        /* storage unavailable: the in-memory table still works */
      }
    }

    /* Best-effort sync with the community mirror of the State Council notices.
       The embedded table is already enough to render; a failure is silent and
       simply leaves the built-in data in place. */
    async function syncHolidays(years) {
      const wanted = [...new Set(years)].filter((y) => y >= 2000 && y <= 2100);
      if (!wanted.length) return false;
      let changed = false;
      for (const year of wanted) {
        const fresh = holidayYears.has(String(year)) && Date.now() - holidaySyncedAt < HOLIDAY_REFRESH_MS;
        if (fresh) continue;
        let payload = null;
        try {
          const controller = typeof AbortController === 'function' ? new AbortController() : null;
          const timer = controller ? window.setTimeout(() => controller.abort(), 6000) : null;
          const response = await window.fetch(`${HOLIDAY_BASE}${year}.json`, controller ? { signal: controller.signal } : undefined);
          if (timer) window.clearTimeout(timer);
          if (response && response.ok) payload = await response.json();
        } catch (error) {
          payload = null;
        }
        if (!payload || !Array.isArray(payload.days)) continue;
        payload.days.forEach((day) => {
          if (!day || typeof day.date !== 'string' || typeof day.name !== 'string') return;
          holidayMap.set(day.date, [day.name, day.isOffDay === true]);
          holidayYears.add(day.date.slice(0, 4));
          changed = true;
        });
      }
      if (changed) {
        holidaySyncedAt = Date.now();
        saveHolidayCache();
      }
      return changed;
    }

    /* ------------------------------------------------- Chinese calendar data */

    /* Bit-packed lunar table and the exact 24-solar-term table for 1900-2100.
       Generated from the astronomical implementation in lunar-javascript (MIT)
       and cross-checked against solarlunar (ISC) and the classic published
       table; regenerate with the tooling described in the README. */
    const LUNAR_INFO = [0x4bd8,0x4ae0,0xa570,0x54d5,0xd260,0xd950,0x16554,0x56a0,0x9ad0,0x55d2,0x4ae0,0xa5b6,0xa4d0,0xd250,0x1d255,0xb540,0xd6a0,0xada2,0x95b0,0x14977,0x4970,0xa4b0,0xb4b5,0x6a50,0x6d40,0x1ab54,0x2b60,0x9570,0x52f2,0x4970,0x6566,0xd4a0,0xea50,0x16a95,0x5ad0,0x2b60,0x186e3,0x92e0,0x1c8d7,0xc950,0xd4a0,0x1d8a6,0xb550,0x56a0,0x1a5b4,0x25d0,0x92d0,0xd2b2,0xa950,0xb557,0x6ca0,0xb550,0x15355,0x4da0,0xa5b0,0x14573,0x52b0,0xa9a8,0xe950,0x6aa0,0xaea6,0xab50,0x4b60,0xaae4,0xa570,0x5260,0xf263,0xd950,0x5b57,0x56a0,0x96d0,0x4dd5,0x4ad0,0xa4d0,0xd4d4,0xd250,0xd558,0xb540,0xb6a0,0x195a6,0x95b0,0x49b0,0xa974,0xa4b0,0xb27a,0x6a50,0x6d40,0xaf46,0xab60,0x9570,0x4af5,0x4970,0x64b0,0x74a3,0xea50,0x6b58,0x5ac0,0xab60,0x96d5,0x92e0,0xc960,0xd954,0xd4a0,0xda50,0x7552,0x56a0,0xabb7,0x25d0,0x92d0,0xcab5,0xa950,0xb4a0,0xbaa4,0xad50,0x55d9,0x4ba0,0xa5b0,0x15176,0x52b0,0xa930,0x7954,0x6aa0,0xad50,0x5b52,0x4b60,0xa6e6,0xa4e0,0xd260,0xea65,0xd530,0x5aa0,0x76a3,0x96d0,0x4afb,0x4ad0,0xa4d0,0x1d0b6,0xd250,0xd520,0xdd45,0xb5a0,0x56d0,0x55b2,0x49b0,0xa577,0xa4b0,0xaa50,0x1b255,0x6d20,0xada0,0x14b63,0x9370,0x49f8,0x4970,0x64b0,0x168a6,0xea50,0x6b20,0x1a6c4,0xaae0,0x92e0,0xd2e3,0xc960,0xd557,0xd4a0,0xda50,0x5d55,0x56a0,0xa6d0,0x55d4,0x52d0,0xa9b8,0xa950,0xb4a0,0xb6a6,0xad50,0x55a0,0xaba4,0xa5b0,0x52b0,0xb273,0x6930,0x7337,0x6aa0,0xad50,0x14b55,0x4b60,0xa570,0x54e4,0xd160,0xe968,0xd520,0xdaa0,0x16aa6,0x56d0,0x4ae0,0xa9d4,0xa2d0,0xd150,0xf252,0xd520]; // LUNAR_DATA
    const TERM_TABLE = '6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m7m8o8o8o9o8n8n6l5k7m6l7m7m8o9o9o9o8n8n7l5k6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m6m8o8o8o9o8n8n6l5k7m6l7m7m8o9o9o9o8n8n7l5k6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m6m8o8o8o9o8n8n6l5k7m6l7m7m8o9o9o9o8n8n7l5k6l5k6l6m7n8n8n9o8m7m6k4j6l5l6m6m8n8o8n9o8n8m6l4j6l5l6m6m8o8o8o9o8n8n6l5k6m6l6m7m8o8o9o9o8n8n6l5k6l5k6l6m7n8n8n8o8m7m6k4j6l5l6l6m8n8o8n9o8n8m6l4j6l5l6m6m8o8o8o9o8n8m6l5k6m6l6m7m8o8o9o9o8n8n6l5k6l5k6l6m7n8n8n8o8m7m6k4j6l5k6l6m8n8o8n9o8n7m6l4j6l5l6m6m8o8o8o9o8n8m6l5j6l6l6m7m8o8o9o9o8n8n6l5k6l5k6l6m7n8n8n8o8m7m6k4j6l5k6l6m8n8o8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m7m8o8o9o9o8n8n6l5k6l5k6l6m7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m7m8o8o8o9o8n8n6l5k6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m6m8o8o8o9o8n8n6l5k6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m6m8o8o8o9o8n8n6l5k6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j6l6l6m6m8o8o8o9o8n8n6l5k6l5k5l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n8o8m7m6k4j6l5l6m6m8n8o8n9o8n8m6l4j6l5l6m6m8o8o8o9o8n8n6l5k5l5k5l6l7n7n8n8n7m7m5k4j6l5k6l6m7n8n8n8o8m7m6k4j6l5k6l6m8n8o8n9o8n8m6l4j6l5l6m6m8o8o8o9o8n8n6l5k5l5k5l6l7n7n8n8n7m7m5k4j6l5k6l6m7n8n8n8o8m7m6k4j6l5k6l6m8n8o8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5k5k5k5l6l7n7n8n8n7m7m5k4j6l5k6l6m7n8n8n8o8m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j5k5k5l6l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j5k5k5l6l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j5k5k5l5l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8o9o8n8m6l5j5k5k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j6l5l6m6m8n8o8n9o8n8m6l5j5k4k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j6l5k6l6m7n8n8n8o8n7m6k4j6l5l6l6m8n8o8n9o8n8m6l5j5k4k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j6l5k6l6m7n8n8n8o8m7m6k4j6l5k6l6m8n8o8n9o8n8m6l4j5k4k5l5l7m7n7n8n7m7m5k4j5l5k5l6l7n7n8n8n7m7m5k4j6l5k6l6m7n8n8n8o8m7m6k4j6l5k6l6m7n8o8n9o8n7m6l4j5k4k5l5l7m7n7n8n7m7l5k4j5k5k5l6l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8o8m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l6l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j6l5k6l6m7n8n8n9o8n7m6l4j5k4k5l5l7m7n7m8n7m7l5k4i5k4k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j6l5k6l6m7n8n8n8o8n7m6l4j5k4k5k5l7m7n7m8n7m7l5k4i5k4k5l5l7m7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j6l5k6l6m7n8n8n8o8m7m6k4j5k4j5k5l7m7n7m8n7m7l5k3i5k4k5l5l7m7n7n8n7m7m5k4j5l5k5l6l7n7n8n8n7m7m5k4j6l5k6l6l7n8n8n8o8m7m6k4j5k4j5k5l6m7m7m8n7m7l5k3i5k4k5l5l7m7n7n8n7m7l5k4j5k5k5l6l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8o8m7m6k4j5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j6l5k6l6l7n8n8n8n7m7m6k4j5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j5k4j5k5l6m7m7m8n7m6l5k3i5k4k5k5l7m7n7m8n7m7l5k4i5k4k5l5l7n7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j5k4j5k5l6m7m7m7n7m6l5k3i5k4j5k5l7m7n7m8n7m7l5k4i5k4k5l5l7m7n7n8n7m7m5k4j6l5k5l6l7n7n8n8n7m7m6k4j5k4j5k5k6m7m7m7n7l6l5j3i5k4j5k5l6m7m7m8n7m7l5k3i5k4k5l5l7m7n7n8n7m7m5k4j5k5k5l6l7n7n7n8n7m7m5k4j5k4j5k5k6m7m7m7n7l6l5j3i5k4j5k5l6m7m7m8n7m7l5k3i5k4k5l5l7m7n7n8n7m7m5k4j5k5k5l5l7n7n7n8n7m7m5k4j5k4j5k5k6m7m7m7n7l6l5j3i5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4j5k5k5l5l7n7n7n8n7m7m5k4j5k4j5k5k6m7m7m7m6l6l5j3i5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j5k4j5k5k6m7m7m7m6l6l5j3i5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j5k4j4k5k6m6m7m7m6l6l5j3i5k4j5k5l6m7m7m8n7m6l5k3i5k4k5k5l7m7n7m8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m5k4j5k4j4k5k6m6m7m7m6l6l5j3i5k4j5k5l6m7m7m7n7m6l5k3i5k4k5k5l7m7n7m8n7m7l5k4i5k4k5l5l7m7n7n8n7m7m5k4j5k4j4k5k6m6m7m7m6l6l5j3i5k4j5k5l6m7m7m7n7m6l5k3i5k4j5k5l6m7n7m8n7m7l5k4i5k4k5l5l7m7n7n8n7m7m5k4j5k4j4k5k6m6m7m7m6l6l5j3i5k4j5k5k6m7m7m7n7l6l5k3i5k4j5k5l6m7m7m8n7m7l5k3i5k4k5l5l7m7n7n8n7m7m5k4j4j4j4k5k6m6m6m7m6l6l4j3i5k4j5k5k6m7m7m7n7l6l5j3i5k4j5k5l6m7m7m8n7m7l5k3i5k4k5l5l7m7n7n8n7m7m5k4j4j4j4k4k6m6m6m7m6l6l4j3i5k4j5k5k6m7m7m7n7l6l5j3i5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4j4j4j4k4k6m6m6m7m6l6l4j3i5k4j5k5k6m7m7m7m6l6l5j3i5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i4j4j4k4k6m6m6m7m6l6l4j3i5k4j5k5k6m6m7m7m6l6l5j3i5k4j5k5l6m7m7m8n7m6l5k3i5k4k5l5l7m7n7n8n7m7l5k4i5k5k5l5l7n7n7n8n7m7m'; // TERM_DATA
    const CALENDAR_MIN_YEAR = 1900;
    const CALENDAR_MAX_YEAR = 2100;
    const TERM_NAMES = [
      '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
      '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
      '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
    ];
    const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
    const LUNAR_DAY_NAMES = (() => {
      const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
      const names = [];
      for (let day = 1; day <= 30; day += 1) {
        if (day <= 10) names.push(`初${digits[day - 1]}`);
        else if (day < 20) names.push(`十${digits[day - 11]}`);
        else if (day === 20) names.push('二十');
        else if (day < 30) names.push(`廿${digits[day - 21]}`);
        else names.push('三十');
      }
      return names;
    })();

    const lunarValue = (year) => LUNAR_INFO[year - CALENDAR_MIN_YEAR];
    const lunarLeapMonth = (value) => value & 0xf;
    const lunarLeapDays = (value) => (value & 0xf ? ((value & 0x10000) ? 30 : 29) : 0);
    const lunarMonthDays = (value, month) => ((value & (0x10000 >> month)) ? 30 : 29);
    function lunarYearDays(value) {
      let sum = 348;
      for (let bit = 0x8000; bit > 0x8; bit >>= 1) sum += value & bit ? 1 : 0;
      return sum + lunarLeapDays(value);
    }

    /* Gregorian date -> lunar date, or null outside 1900-2100. */
    function solarToLunar(date) {
      const year = date.getFullYear();
      if (year < CALENDAR_MIN_YEAR || year > CALENDAR_MAX_YEAR) return null;
      let offset = Math.floor((Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(1900, 0, 31)) / 86400000);
      if (offset < 0) return null;
      let lunarYear = CALENDAR_MIN_YEAR;
      let span = 0;
      for (; lunarYear < CALENDAR_MAX_YEAR && offset > 0; lunarYear += 1) {
        span = lunarYearDays(lunarValue(lunarYear));
        offset -= span;
      }
      if (offset < 0) {
        offset += span;
        lunarYear -= 1;
      }
      const value = lunarValue(lunarYear);
      const leap = lunarLeapMonth(value);
      let isLeap = false;
      let month = 1;
      for (; month < 13 && offset > 0; month += 1) {
        if (leap > 0 && month === leap + 1 && !isLeap) {
          month -= 1;
          isLeap = true;
          span = lunarLeapDays(value);
        } else {
          span = lunarMonthDays(value, month);
        }
        if (isLeap && month === leap + 1) isLeap = false;
        offset -= span;
      }
      if (offset === 0 && leap > 0 && month === leap + 1) {
        if (isLeap) isLeap = false;
        else {
          isLeap = true;
          month -= 1;
        }
      }
      if (offset < 0) {
        offset += span;
        month -= 1;
      }
      return { year: lunarYear, month, day: offset + 1, isLeap };
    }

    function lunarText(lunar, lang) {
      if (!lunar) return '';
      if (lang === 'zh') {
        const month = LUNAR_MONTH_NAMES[lunar.month - 1] || String(lunar.month);
        return `${lunar.isLeap ? '闰' : ''}${month}月${LUNAR_DAY_NAMES[lunar.day - 1]}`;
      }
      return `Lunar ${lunar.isLeap ? 'leap ' : ''}${lunar.month}/${lunar.day}`;
    }

    /* Today's solar term, if this date is one of the 24. */
    function solarTermOf(date) {
      const year = date.getFullYear();
      if (year < CALENDAR_MIN_YEAR || year > CALENDAR_MAX_YEAR) return null;
      const base = (year - CALENDAR_MIN_YEAR) * 24;
      const day = date.getDate();
      const month = date.getMonth() + 1;
      for (let index = (month - 1) * 2; index < month * 2; index += 1) {
        const digit = TERM_TABLE[base + index];
        if (digit && parseInt(digit, 36) === day) return { name: TERM_NAMES[index], index };
      }
      return null;
    }

    /* The next term after this date, for the tooltip. */
    function nextSolarTerm(date) {
      let cursor = startOfDay(date);
      for (let step = 0; step < 32; step += 1) {
        cursor = addDays(cursor, 1);
        const term = solarTermOf(cursor);
        if (term) return { name: term.name, date: cursor };
      }
      return null;
    }

    const WEEKDAYS = {
      zh: {
        short: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
        long: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        monthDay: (d) => `${d.getMonth() + 1}月${d.getDate()}日`,
      },
      en: {
        short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        monthDay: (d) =>
          `${
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
          } ${d.getDate()}`,
      },
    };

    /* "今天 · 10月7日 星期三" — the heading that sits right above the entries. */
    function dayHeading(date, today, lang, t) {
      const words = WEEKDAYS[lang] || WEEKDAYS.zh;
      return `${dayLabel(date, today, t)} · ${words.monthDay(date)} ${words.long[date.getDay()]}`;
    }

    /* Compact badge for a date: 周末 / 休 / 调休上班, with the festival name. */
    function dayBadge(date, lang, t) {
      const words = WEEKDAYS[lang] || WEEKDAYS.zh;
      const holiday = holidayOf(date);
      if (holiday) {
        return holiday[1]
          ? { tone: 'off', label: holiday[0], mark: t('holidayOff') }
          : { tone: 'work', label: holiday[0], mark: t('holidayWork') };
      }
      const day = date.getDay();
      if (day === 0 || day === 6) return { tone: 'weekend', label: t('weekend'), mark: words.short[day] };
      return null;
    }

    const pad2 = (n) => (n < 10 ? '0' + n : String(n));
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    function parseDayKey(key) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
      return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : startOfDay(new Date());
    }

    function toInput(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return `${dayKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function fromInput(value) {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

    function isoAt(d) {
      return d.toISOString();
    }

    const fmtClock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const fmtDate = (d) => `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    function dayLabel(d, today, t) {
      const key = dayKey(d);
      if (key === dayKey(today)) return t('today');
      if (key === dayKey(addDays(today, 1))) return t('tomorrow');
      if (key === dayKey(addDays(today, -1))) return t('yesterday');
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }

    function durationText(ms, t) {
      const minutes = Math.max(1, Math.round(ms / 60000));
      if (minutes < 60) return `${minutes} ${t('minutes')}`;
      const hours = ms / 3600000;
      if (hours < 24) return `${Math.round(hours * 10) / 10} ${t('hours')}`;
      return `${Math.round((hours / 24) * 10) / 10} ${t('days')}`;
    }

    function rangeStart(note) {
      if (!note.startAt) return null;
      const d = new Date(note.startAt);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    function rangeEnd(note) {
      if (!note.endAt) return null;
      const d = new Date(note.endAt);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    /* A range is always ordered: an end that precedes its start (typed by hand
       or left over in stored data) is swapped, so nothing can ever show a
       negative duration or a bar that runs backwards. */
    function orderRange(startAt, endAt) {
      if (!startAt || !endAt) return { startAt, endAt };
      const start = new Date(startAt).getTime();
      const end = new Date(endAt).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end >= start) return { startAt, endAt };
      return { startAt: endAt, endAt: startAt };
    }

    function noteStatus(note, now) {
      const s = rangeStart(note);
      if (!s) return 'untimed';
      const start = s.getTime();
      const end = rangeEnd(note);
      if (!end) return now >= start ? 'ended' : 'point';
      const stop = end.getTime();
      if (now > stop) return 'ended';
      if (now >= start) return 'running';
      return 'upcoming';
    }

    /* When an entry counts as finished: the moment its range ended, or its
       start when no end was set. This is also the order finished entries are
       listed in. */
    function completedAt(note) {
      const e = rangeEnd(note);
      if (e) return e.getTime();
      const s = rangeStart(note);
      return s ? s.getTime() : 0;
    }

    function isDone(note, now) {
      return noteStatus(note, now) === 'ended';
    }

    /* The nearest entry that is not finished yet: something running now wins,
       otherwise the soonest upcoming one. */
    function nextPending(notes, now) {
      const pending = notes.filter((note) => {
        if (!rangeStart(note)) return false;
        const status = noteStatus(note, now);
        return status === 'running' || status === 'upcoming';
      });
      if (!pending.length) return null;
      const byStart = (a, b) => rangeStart(a).getTime() - rangeStart(b).getTime();
      const running = pending.filter((note) => noteStatus(note, now) === 'running').sort(byStart);
      if (running.length) return running[0];
      return pending.filter((note) => noteStatus(note, now) === 'upcoming').sort(byStart)[0] || null;
    }

    /* Compact "14:00–15:30" (with the date when it is not today) for the
       collapsed pill, where space is tight. */
    function compactRange(note, today, t) {
      const s = rangeStart(note);
      if (!s) return t('untimed');
      const sameDay = dayKey(s) === dayKey(today);
      const head = sameDay ? fmtClock(s) : `${fmtDate(s)} ${fmtClock(s)}`;
      const e = rangeEnd(note);
      if (!e) return head;
      return `${head}–${fmtClock(e)}`;
    }

    function rangeText(note, t) {
      const s = rangeStart(note);
      if (!s) return t('untimed');
      const e = rangeEnd(note);
      const head = `${fmtDate(s)} ${fmtClock(s)}`;
      if (!e) return `${head} · ${t('point')}`;
      const span = e.getTime() - s.getTime();
      return `${head} → ${fmtClock(e)} · ${durationText(Math.max(span, 60000), t)}`;
    }

    /* Every entry belongs to exactly one category; the category owns both the
       card's accent and the timeline lane. */
    const KINDS = ['work', 'personal'];

    /* Resize handles: four edges plus four corners. */
    const RESIZE_DIRS = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'];

    function normalizeKind(value) {
      return value === 'personal' ? 'personal' : 'work';
    }

    function kindLabelOf(kind, t) {
      return kind === 'personal' ? t('kindPersonal') : t('kindWork');
    }

    function newId() {
      const c = globalThis.crypto;
      if (c && typeof c.randomUUID === 'function') return c.randomUUID();
      return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /* ---------------------------------------------------------------- state */

    const DEFAULT_PANEL = { w: 340, h: 452, x: null, y: null };
    const PRESETS = [
      { w: 340, h: 452 },
      { w: 470, h: 640 },
    ];

    function defaultState() {
      return {
        notes: [],
        panel: { ...DEFAULT_PANEL },
        mode: 'expanded',
        timeline: true,
        day: dayKey(new Date()),
        doneOrder: 'asc',
        preset: 0,
        corner: { h: 'right', v: 'bottom' },
        createdAt: new Date().toISOString(),
      };
    }

    function sanitizeNote(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const text = typeof raw.text === 'string' ? raw.text.slice(0, 20000) : '';
      const id = typeof raw.id === 'string' && raw.id ? raw.id : newId();
      const range = orderRange(
        typeof raw.startAt === 'string' ? raw.startAt : null,
        typeof raw.endAt === 'string' ? raw.endAt : null,
      );
      return {
        id,
        text,
        kind: normalizeKind(raw.kind),
        startAt: range.startAt,
        endAt: range.endAt,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
      };
    }

    function loadState() {
      const base = defaultState();
      let raw = null;
      try {
        raw = window.localStorage.getItem(STORE_KEY);
      } catch (error) {
        return base;
      }
      if (!raw) return base;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return base;
        const panel = parsed.panel && typeof parsed.panel === 'object' ? parsed.panel : {};
        return {
          notes: Array.isArray(parsed.notes) ? parsed.notes.map(sanitizeNote).filter(Boolean) : [],
          panel: {
            w: clamp(Number(panel.w) || DEFAULT_PANEL.w, MIN_W, MAX_W),
            h: clamp(Number(panel.h) || DEFAULT_PANEL.h, MIN_H, MAX_H),
            x: Number.isFinite(panel.x) ? Number(panel.x) : null,
            y: Number.isFinite(panel.y) ? Number(panel.y) : null,
          },
          mode: parsed.mode === 'collapsed' || parsed.mode === 'orb' ? parsed.mode : 'expanded',
          timeline: parsed.timeline !== false,
          day: typeof parsed.day === 'string' ? parsed.day : base.day,
          doneOrder: parsed.doneOrder === 'desc' ? 'desc' : 'asc',
          preset: Number.isInteger(parsed.preset) ? clamp(parsed.preset, 0, PRESETS.length - 1) : 0,
          corner: {
            h: parsed.corner && parsed.corner.h === 'left' ? 'left' : 'right',
            v: parsed.corner && parsed.corner.v === 'top' ? 'top' : 'bottom',
          },
          createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : base.createdAt,
        };
      } catch (error) {
        return base;
      }
    }

    function saveState(state) {
      try {
        window.localStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            notes: state.notes,
            panel: state.panel,
            mode: state.mode,
            timeline: state.timeline,
            day: state.day,
            doneOrder: state.doneOrder,
            preset: state.preset,
            corner: state.corner,
            createdAt: state.createdAt,
          }),
        );
      } catch (error) {
        /* storage unavailable or full: the schedule keeps working in memory. */
      }
    }

    /* ------------------------------------------------------------------ css */

    const CSS = `
.agn-root{
  position:fixed;inset:0;pointer-events:none;z-index:20;
  color-scheme:dark;
  font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Microsoft YaHei",system-ui,sans-serif);
  -webkit-font-smoothing:antialiased;
  /* Liquid black glass: the material is deliberately dark in both host themes,
     with its own palette instead of the light/dark theme tokens. */
  --agn-ink:#f5f6f8;
  --agn-muted:rgba(233,236,242,.66);
  --agn-accent:#8fb4ff;
  --agn-warn:#f2c078;
  --agn-ok:#6fd6ad;
  --agn-idle:rgba(233,236,242,.46);
  --agn-danger:#ff8f85;
  --agn-holiday:#ff7b72;
  --agn-surface:#0a0b0e;
  --agn-layer:#16181d;
  --agn-glass:rgba(12,13,17,.72);
  --agn-glass-strong:rgba(16,17,22,.88);
  --agn-fill:rgba(255,255,255,.075);
  --agn-fill-hover:rgba(255,255,255,.14);
  --agn-hairline:rgba(255,255,255,.09);
  --agn-line:rgba(255,255,255,.18);
  --agn-rim:rgba(255,255,255,.34);
  --agn-shadow:0 30px 70px -24px rgba(0,0,0,.82),0 12px 30px -18px rgba(0,0,0,.62),0 2px 8px -4px rgba(0,0,0,.5);
  --agn-blur:blur(30px) saturate(180%) brightness(.92);
  --agn-ease:cubic-bezier(.22,1,.36,1);
  --agn-work:#a78bfa;
  --agn-personal:#5b9bff;
}
.agn-root *{box-sizing:border-box}
/* :where() keeps this reset at zero specificity for the element part, so a
   class-only rule such as .agn-bar or .agn-primary can still set its own
   background/color/border later in the sheet. */
.agn-root :where(button){font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
.agn-root :where(button,input,textarea,select):focus-visible{outline:2px solid var(--agn-accent);outline-offset:2px}
.agn-surface{
  pointer-events:auto;position:absolute;isolation:isolate;overflow:hidden;color:var(--agn-ink);
  border-radius:26px;
  background:linear-gradient(152deg,var(--agn-glass-strong),var(--agn-glass));
  backdrop-filter:var(--agn-blur);-webkit-backdrop-filter:var(--agn-blur);
  box-shadow:var(--agn-shadow),inset 0 1px 0 var(--agn-rim),inset 0 -1px 0 var(--agn-hairline);
  -webkit-app-region:no-drag;
  transition:box-shadow .3s var(--agn-ease),transform .3s var(--agn-ease),border-radius .3s var(--agn-ease);
}
.agn-surface::before{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
  background:
    radial-gradient(120% 88% at 6% -18%,rgba(255,255,255,.17),transparent 58%),
    radial-gradient(90% 70% at 104% 112%,color-mix(in srgb,var(--agn-accent) 18%,transparent),transparent 62%);
  mix-blend-mode:screen;opacity:.9;
}
.agn-surface::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:3;padding:1px;
  background:linear-gradient(150deg,var(--agn-rim),rgba(255,255,255,.05) 44%,color-mix(in srgb,var(--agn-rim) 70%,transparent));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
}
.agn-surface>*{position:relative;z-index:1}
.agn-panel{display:flex;flex-direction:column;min-width:${MIN_W}px;min-height:${MIN_H}px}
.agn-panel[data-dragging="true"]{transition:none;box-shadow:0 40px 90px -26px rgba(0,0,0,.9),0 16px 36px -20px rgba(0,0,0,.7),inset 0 1px 0 var(--agn-rim)}
.agn-pop{animation:agn-pop .3s var(--agn-ease) both}
@keyframes agn-pop{from{opacity:0;transform:scale(.94) translateY(6px)}to{opacity:1;transform:none}}
.agn-head{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.agn-head:active{cursor:grabbing}
.agn-head[data-static="true"]{cursor:default}
.agn-dot{width:10px;height:10px;border-radius:50%;flex:none;background:conic-gradient(from 210deg,var(--agn-work),var(--agn-personal),var(--agn-work));box-shadow:0 0 0 .5px var(--agn-line),0 2px 8px color-mix(in srgb,var(--agn-work) 55%,transparent)}
.agn-titles{display:flex;flex-direction:column;min-width:0;flex:1;gap:1px}
.agn-title{font-size:13.5px;font-weight:600;letter-spacing:.01em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.agn-sub{font-size:11px;line-height:1.3;color:var(--agn-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.agn-sub-alt{font-variant-numeric:tabular-nums}
.agn-sub-alt[data-tip]{cursor:default}
.agn-actions{display:flex;align-items:center;gap:4px;flex:none}
.agn-btn{
  display:grid;place-items:center;width:28px;height:28px;border-radius:10px;color:var(--agn-muted);
  box-shadow:inset 0 0 0 .5px transparent;transition:background .18s var(--agn-ease),color .18s var(--agn-ease),transform .18s var(--agn-ease);
}
.agn-btn:hover{background:var(--agn-fill-hover);color:var(--agn-ink)}
.agn-btn:active{transform:scale(.94)}
.agn-btn[data-tone="danger"]:hover{color:var(--agn-danger)}
.agn-chip{
  display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:500;
  color:var(--agn-muted);background:var(--agn-fill);box-shadow:inset 0 0 0 .5px var(--agn-hairline);white-space:nowrap;
}
.agn-chip[data-tone="accent"]{color:var(--agn-accent)}
/* The toolbar and the timeline live outside .agn-body, so they never scroll:
   only the entry list below them moves. */
.agn-fixed{flex:none;padding:0 12px;position:relative;z-index:2}
.agn-body{flex:1;min-height:0;overflow:auto;padding:0 12px 12px;scrollbar-width:thin;scrollbar-color:var(--agn-line) transparent}
.agn-body::-webkit-scrollbar{width:8px}
.agn-body::-webkit-scrollbar-thumb{background:var(--agn-line);border-radius:999px}
.agn-tools{display:flex;align-items:center;gap:6px;padding:2px 0 10px}
.agn-primary{
  display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:12px;font-size:12.5px;font-weight:600;
  color:#0a0b0e;background:linear-gradient(180deg,color-mix(in srgb,var(--agn-accent) 94%,#ffffff 6%),color-mix(in srgb,var(--agn-accent) 88%,#000000 12%));
  box-shadow:0 6px 16px -8px color-mix(in srgb,var(--agn-accent) 80%,transparent),inset 0 1px 0 color-mix(in srgb,#ffffff 55%,transparent);
  transition:transform .18s var(--agn-ease),filter .18s var(--agn-ease);position:relative;z-index:1;
}
.agn-primary:hover{filter:brightness(1.05)}
.agn-primary:active{transform:scale(.97)}
.agn-primary[data-icon="true"]{width:32px;padding:0;justify-content:center}
.agn-tool{
  display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border-radius:12px;font-size:12px;
  color:var(--agn-muted);background:var(--agn-fill);box-shadow:inset 0 0 0 .5px var(--agn-hairline);
  transition:background .18s var(--agn-ease),color .18s var(--agn-ease);position:relative;z-index:1;
}
.agn-tool[data-icon="true"]{width:32px;padding:0;justify-content:center}
.agn-tool:hover{background:var(--agn-fill-hover);color:var(--agn-ink)}
.agn-tool[data-on="true"]{color:var(--agn-accent);box-shadow:inset 0 0 0 .5px color-mix(in srgb,var(--agn-accent) 45%,transparent)}
/* Tooltip: one shared element in the frame layer, positioned by script around
   the hovered anchor, so the panel's rounded clip never cuts it off and it
   always flips to the side that has room. */
.agn-tip-host{display:inline-flex;align-items:center;justify-content:center}
.agn-tip{
  position:fixed;left:0;top:0;z-index:40;pointer-events:none;
  max-width:calc(100vw - 16px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  padding:5px 9px;border-radius:10px;font-size:11px;line-height:1.15;font-weight:500;color:var(--agn-ink);
  background:rgba(10,11,14,.93);
  backdrop-filter:var(--agn-blur);-webkit-backdrop-filter:var(--agn-blur);
  box-shadow:0 12px 26px -14px rgba(0,0,0,.9),inset 0 0 0 .5px var(--agn-rim);
  opacity:0;transform:translate(-1000px,-1000px);
  transition:opacity .15s var(--agn-ease);
  will-change:transform,opacity;
}
.agn-tip[data-visible="true"]{opacity:1}
.agn-spacer{flex:1}
.agn-tl{padding:0 0 10px}
.agn-tl-top{display:flex;align-items:center;gap:6px;padding:0 0 8px}
.agn-date{
  height:28px;padding:0 8px;border-radius:10px;font-size:12px;color:var(--agn-ink);
  background:var(--agn-fill);box-shadow:inset 0 0 0 .5px var(--agn-hairline);border:0;color-scheme:inherit;
}
.agn-date::-webkit-calendar-picker-indicator{opacity:.55;cursor:pointer}
.agn-strip{position:relative;height:72px;border-radius:14px;background:var(--agn-fill);box-shadow:inset 0 0 0 .5px var(--agn-hairline);overflow:hidden}
.agn-grid{position:absolute;top:0;bottom:0;width:.5px;background:var(--agn-line)}
.agn-grid-label{position:absolute;bottom:1px;font-size:9px;color:var(--agn-muted);transform:translateX(-50%)}
.agn-lane-rule{position:absolute;left:0;right:0;top:33px;height:.5px;background:var(--agn-hairline)}
.agn-bar{
  position:absolute;height:22px;border-radius:9px;min-width:6px;padding:0;cursor:pointer;
  /* flat category colour on purpose: no glass, no gloss, no gradient */
  background:var(--agn-bar,var(--agn-work));
  border:0;box-shadow:none;
  transition:filter .18s var(--agn-ease);
}
.agn-bar[data-lane="work"]{top:8px}
.agn-bar[data-lane="personal"]{top:36px}
.agn-bar[data-kind="work"]{--agn-bar:var(--agn-work)}
.agn-bar[data-kind="personal"]{--agn-bar:var(--agn-personal)}
.agn-bar:hover{filter:brightness(1.12)}
.agn-bar[data-clip="start"]{border-top-left-radius:3px;border-bottom-left-radius:3px}
.agn-bar[data-clip="end"]{border-top-right-radius:3px;border-bottom-right-radius:3px}
.agn-now{position:absolute;top:6px;bottom:14px;width:1.5px;background:var(--agn-accent);box-shadow:0 0 10px color-mix(in srgb,var(--agn-accent) 70%,transparent)}
.agn-legend{display:inline-flex;align-items:center;gap:10px;font-size:11px;color:var(--agn-muted)}
.agn-legend-item{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.agn-dotkind{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 0 .5px var(--agn-line)}
.agn-dotkind[data-kind="work"]{background:var(--agn-work)}
.agn-dotkind[data-kind="personal"]{background:var(--agn-personal)}
.agn-tl-empty{position:absolute;inset:0;display:grid;place-items:center;font-size:11px;color:var(--agn-muted)}
.agn-group{margin-bottom:10px}
.agn-group-head{display:flex;align-items:center;gap:8px;padding:6px 4px;font-size:11px;color:var(--agn-muted);letter-spacing:.02em}
.agn-group-head strong{font-size:11.5px;font-weight:600;color:var(--agn-ink)}
.agn-daybadge{display:inline-flex;align-items:center;gap:4px;height:17px;padding:0 6px;border-radius:6px;font-size:10px;font-weight:600;letter-spacing:.02em;white-space:nowrap}
.agn-daybadge[data-tone="off"]{color:var(--agn-holiday);background:color-mix(in srgb,var(--agn-holiday) 18%,transparent)}
.agn-daybadge[data-tone="work"]{color:var(--agn-warn);background:color-mix(in srgb,var(--agn-warn) 18%,transparent)}
.agn-daybadge[data-tone="weekend"]{color:var(--agn-muted);background:var(--agn-fill)}
.agn-subhead{display:flex;align-items:center;gap:8px;padding:8px 4px 5px;font-size:10.5px;color:var(--agn-muted);letter-spacing:.02em}
.agn-subhead strong{font-size:10.5px;font-weight:500;color:var(--agn-muted)}
.agn-rule{flex:1;height:.5px;background:var(--agn-hairline)}
.agn-note{
  border-radius:16px;padding:10px 11px 10px 13px;margin-bottom:8px;position:relative;overflow:hidden;
  background:linear-gradient(160deg,color-mix(in srgb,var(--agn-layer) 74%,transparent),color-mix(in srgb,var(--agn-layer) 46%,transparent));
  box-shadow:inset 0 0 0 .5px var(--agn-hairline),0 6px 18px -14px rgba(15,23,42,.5);
  transition:box-shadow .25s var(--agn-ease),transform .25s var(--agn-ease);
}
.agn-note::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--agn-kind,var(--agn-work));opacity:.85}
.agn-note[data-kind="work"]{--agn-kind:var(--agn-work)}
.agn-note[data-kind="personal"]{--agn-kind:var(--agn-personal)}
/* finished entries are dimmed until you point at them */
.agn-note[data-done="true"]{opacity:.5;filter:saturate(.6)}
.agn-note[data-done="true"]:hover,.agn-note[data-done="true"]:focus-within{opacity:.92;filter:none}
.agn-note[data-flash="true"]{animation:agn-flash 1.2s var(--agn-ease) 2}
@keyframes agn-flash{0%,100%{box-shadow:inset 0 0 0 .5px var(--agn-hairline),0 6px 18px -14px rgba(15,23,42,.5)}40%{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--agn-accent) 65%,transparent),0 8px 26px -12px color-mix(in srgb,var(--agn-accent) 60%,transparent)}}
.agn-note-top{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.agn-kinds{display:inline-flex;align-items:center;gap:8px;flex:none}
/* Category control is deliberately flat: no fill, no border, no blur — only the
   coloured circle and its label. Hover and the active state change colour. */
.agn-kind{
  display:inline-flex;align-items:center;gap:6px;height:22px;padding:0;border-radius:0;
  font-size:10.5px;font-weight:500;line-height:1;color:var(--agn-muted);
  background:none;border:0;box-shadow:none;
  transition:color .18s var(--agn-ease);
}
.agn-kind:hover{color:var(--agn-ink);background:none;box-shadow:none}
.agn-kind .agn-dotkind{width:12px;height:12px;opacity:.4;transition:opacity .18s var(--agn-ease)}
.agn-kind[data-on="true"]{color:var(--agn-kind);background:none;box-shadow:none}
.agn-kind[data-on="true"] .agn-dotkind{opacity:1}
.agn-kind[data-kind="work"]{--agn-kind:var(--agn-work)}
.agn-kind[data-kind="personal"]{--agn-kind:var(--agn-personal)}
.agn-caret{display:inline-flex;align-items:center;margin-left:1px;opacity:.7}
.agn-kindcaret{
  display:grid;place-items:center;width:20px;height:22px;border-radius:0;color:var(--agn-muted);
  background:none;border:0;box-shadow:none;
  transition:color .18s var(--agn-ease);
}
.agn-kindcaret:hover{background:none;color:var(--agn-ink)}
.agn-badge{
  display:inline-flex;align-items:center;gap:5px;height:21px;min-width:0;flex:0 1 auto;
  padding:0 8px;border-radius:8px;font-size:11px;font-weight:500;
  color:var(--agn-muted);background:var(--agn-fill);box-shadow:inset 0 0 0 .5px var(--agn-hairline);
  font-variant-numeric:tabular-nums;
}
.agn-badge-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.agn-badge .agn-dotkind{width:7px;height:7px;box-shadow:0 0 0 .5px var(--agn-line)}
.agn-badge[data-status="running"]{color:var(--agn-ok)}
.agn-badge[data-status="upcoming"]{color:var(--agn-accent)}
.agn-badge[data-status="ended"]{color:var(--agn-idle)}
.agn-badge[data-status="point"]{color:var(--agn-warn)}
.agn-note-actions{display:flex;align-items:center;gap:2px;margin-left:0;flex:none}
.agn-mini{display:grid;place-items:center;width:24px;height:24px;border-radius:8px;color:var(--agn-muted);transition:background .18s var(--agn-ease),color .18s var(--agn-ease)}
.agn-mini:hover{background:var(--agn-fill-hover);color:var(--agn-ink)}
.agn-mini[data-tone="danger"]:hover{color:var(--agn-danger)}
.agn-text{
  display:block;width:100%;border:0;background:transparent;resize:none;overflow:hidden;
  color:var(--agn-ink);font-size:12.8px;line-height:1.62;min-height:44px;max-height:220px;padding:2px;outline:none;
}
.agn-text::placeholder{color:color-mix(in srgb,var(--agn-muted) 70%,transparent)}
.agn-range{display:flex;flex-direction:column;gap:6px;margin-top:8px;padding-top:8px;border-top:.5px solid var(--agn-hairline)}
.agn-range-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.agn-field{display:flex;align-items:center;gap:6px;flex:1;min-width:132px}
.agn-field span{font-size:10.5px;color:var(--agn-muted);flex:none;width:26px}
.agn-input{
  flex:1;min-width:0;height:28px;padding:0 8px;border-radius:9px;border:0;font-size:11.5px;color:var(--agn-ink);
  background:var(--agn-fill);box-shadow:inset 0 0 0 .5px var(--agn-hairline);color-scheme:inherit;
}
.agn-input::-webkit-calendar-picker-indicator{opacity:.5;cursor:pointer}
.agn-emptystate{padding:18px 12px;text-align:center;font-size:12px;color:var(--agn-muted);line-height:1.7}
.agn-foot{display:flex;align-items:center;gap:8px;padding:0 2px;font-size:10.5px;color:color-mix(in srgb,var(--agn-muted) 85%,transparent)}
.agn-link{color:inherit;text-decoration:none;border-radius:6px;padding:2px 6px;transition:background .18s var(--agn-ease),color .18s var(--agn-ease)}
.agn-link:hover{background:var(--agn-fill-hover);color:var(--agn-ink)}
.agn-link[data-armed="true"]{color:var(--agn-danger)}
/* Eight resize hot zones hugging the panel's inner edge (the panel clips to its
   rounded box, so the handles sit inside it). Only the south-east one carries a
   tooltip; the cursor shape tells the rest. */
.agn-rz{position:absolute;z-index:5;touch-action:none;-webkit-app-region:no-drag}
.agn-rz[data-dir="n"]{top:0;left:16px;right:16px;height:6px;cursor:ns-resize}
.agn-rz[data-dir="s"]{bottom:0;left:16px;right:16px;height:6px;cursor:ns-resize}
.agn-rz[data-dir="w"]{left:0;top:16px;bottom:16px;width:6px;cursor:ew-resize}
.agn-rz[data-dir="e"]{right:0;top:16px;bottom:16px;width:6px;cursor:ew-resize}
.agn-rz[data-dir="nw"]{top:0;left:0;width:18px;height:18px;cursor:nwse-resize}
.agn-rz[data-dir="ne"]{top:0;right:0;width:18px;height:18px;cursor:nesw-resize}
.agn-rz[data-dir="sw"]{bottom:0;left:0;width:18px;height:18px;cursor:nesw-resize}
.agn-rz[data-dir="se"]{bottom:0;right:0;width:22px;height:22px;cursor:nwse-resize}
.agn-rz::after{content:"";position:absolute;background:var(--agn-accent);opacity:0;border-radius:3px;transition:opacity .18s var(--agn-ease)}
.agn-rz[data-dir="n"]::after{left:0;right:0;top:1px;height:2px}
.agn-rz[data-dir="s"]::after{left:0;right:0;bottom:1px;height:2px}
.agn-rz[data-dir="w"]::after{top:0;bottom:0;left:1px;width:2px}
.agn-rz[data-dir="e"]::after{top:0;bottom:0;right:1px;width:2px}
.agn-rz[data-dir="nw"]::after,.agn-rz[data-dir="ne"]::after,.agn-rz[data-dir="sw"]::after,.agn-rz[data-dir="se"]::after{width:8px;height:8px;border-radius:50%}
.agn-rz[data-dir="nw"]::after{top:6px;left:6px}
.agn-rz[data-dir="ne"]::after{top:6px;right:6px}
.agn-rz[data-dir="sw"]::after{bottom:6px;left:6px}
.agn-rz[data-dir="se"]::after{bottom:6px;right:6px}
.agn-rz:hover::after,.agn-panel[data-dragging="true"] .agn-rz::after{opacity:.5}
.agn-pill{display:inline-flex;align-items:center;gap:9px;height:46px;padding:0 12px 0 14px;border-radius:23px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;overflow:visible}
.agn-pill:active{cursor:grabbing}
.agn-orb{
  width:48px;height:48px;border-radius:50%;display:grid;place-items:center;cursor:grab;touch-action:none;
  user-select:none;-webkit-user-select:none;overflow:visible;
  transition:transform .25s var(--agn-ease),box-shadow .3s var(--agn-ease);
}
.agn-orb:active{cursor:grabbing}
.agn-orb:hover{transform:scale(1.06)}
.agn-orb:active{transform:scale(.96)}
.agn-glyph{width:20px;height:20px;display:block;flex:none}
/* the collapsed pill advertises the nearest unfinished entry: time on the first
   line, its text on the second, both ellipsised when space runs out */
.agn-pill .agn-titles{flex:0 1 auto;min-width:0;max-width:240px}
.agn-next-time{display:inline-flex;align-items:center;gap:6px;min-width:0;font-variant-numeric:tabular-nums}
.agn-next-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.agn-orb-dot{position:absolute;top:4px;right:4px;width:11px;height:11px;border-radius:50%;box-shadow:0 0 0 2px rgba(10,11,14,.92)}
.agn-orb-dot[data-kind="work"]{background:var(--agn-work)}
.agn-orb-dot[data-kind="personal"]{background:var(--agn-personal)}
.agn-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@supports not (backdrop-filter:blur(4px)){
  .agn-surface{background:color-mix(in srgb,var(--agn-surface) 96%,transparent)}
}
@media (prefers-reduced-motion:reduce){
  .agn-surface,.agn-note,.agn-bar,.agn-btn,.agn-primary,.agn-tool{transition:none!important}
  .agn-pop{animation:none}
  .agn-note[data-flash="true"]{animation:none;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--agn-accent) 65%,transparent)}
}
`;

    /* ----------------------------------------------------------- components */

    const ICON = {
      plus: 'M10 4.6v10.8M4.6 10h10.8',
      arrowUp: 'M10 15.2V5M5.8 9.2 10 5l4.2 4.2',
      arrowDown: 'M10 4.8V15M5.8 10.8 10 15l4.2-4.2',
      chevronDown: 'M5.6 8.2 10 12.6l4.4-4.4',
      chevronUp: 'M5.6 11.8 10 7.4l4.4 4.4',
      chevronLeft: 'M11.8 5.6 7.4 10l4.4 4.4',
      chevronRight: 'M8.2 5.6 12.6 10l-4.4 4.4',
      minus: 'M4.6 10h10.8',
      clock: 'M10 4.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6Zm0 3.1V10l2.4 1.5',
      trash: 'M4.8 6.2h10.4M8 6.2V4.9c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v1.3M6.4 6.2l.6 8.2c0 .6.5 1 1 1h4c.6 0 1-.4 1-1l.6-8.2',
      resize: 'M5 15V5h10',
      list: 'M4.8 5.6h10.4M4.8 10h10.4M4.8 14.4h6.4',
      target: 'M10 2.9v2.2M10 14.9v2.2M2.9 10h2.2M14.9 10h2.2M10 6.6A3.4 3.4 0 1 0 10 13.4 3.4 3.4 0 0 0 10 6.6Z',
    };

    function Glyph({ name, size = 16 }) {
      const d = ICON[name] || ICON.plus;
      return h(
        'svg',
        {
          className: 'agn-glyph',
          width: size,
          height: size,
          viewBox: '0 0 20 20',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d }),
      );
    }

    function autoGrow(el) {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    }

    function NoteTextarea({ note, t, onText }) {
      const ref = useRef(null);
      useEffect(() => {
        autoGrow(ref.current);
      }, [note.text, note.id]);
      return h('textarea', {
        ref,
        className: 'agn-text',
        value: note.text,
        placeholder: t('placeholder'),
        spellCheck: false,
        onChange: (event) => {
          autoGrow(event.currentTarget);
          onText(event.currentTarget.value);
        },
      });
    }

    /* Any element carrying data-tip becomes a tooltip anchor; the shared tip
       element is placed by the controller in Notepad. */
    function Tip({ label, children }) {
      if (!label) return children;
      return h('span', { className: 'agn-tip-host', 'data-tip': label }, children);
    }

    function IconButton({ icon, label, tone, onClick }) {
      return h(
        Tip,
        { label },
        h(
          'button',
          { type: 'button', className: 'agn-mini', 'aria-label': label, 'data-tone': tone, onClick },
          h(Glyph, { name: icon, size: 15 }),
        ),
      );
    }

    function KindPicker({ kind, t, open, onOpen }) {
      if (!open) {
        return h(
          Tip,
          { label: t('kindSwitch') },
          h(
            'button',
            {
              type: 'button',
              className: 'agn-kind',
              'data-kind': kind,
              'data-on': 'true',
              'aria-expanded': false,
              'aria-label': `${t('kindLabel')}: ${kindLabelOf(kind, t)}`,
              onClick: () => onOpen(true),
            },
            h('span', { className: 'agn-dotkind', 'data-kind': kind }),
            kindLabelOf(kind, t),
            h('span', { className: 'agn-caret' }, h(Glyph, { name: 'chevronDown', size: 12 })),
          ),
        );
      }
      return h(
        'div',
        { className: 'agn-kinds', role: 'group', 'aria-label': t('kindLabel') },
        KINDS.map((each) =>
          h(
            Tip,
            { key: each, label: each === 'work' ? t('kindWorkHint') : t('kindPersonalHint') },
            h(
              'button',
              {
                type: 'button',
                className: 'agn-kind',
                'data-kind': each,
                'data-on': kind === each ? 'true' : 'false',
                'aria-pressed': kind === each,
                'aria-label': kindLabelOf(each, t),
                onClick: () => onOpen(false, each),
              },
              h('span', { className: 'agn-dotkind', 'data-kind': each }),
              kindLabelOf(each, t),
            ),
          ),
        ),
        h(
          Tip,
          { label: t('kindCollapse') },
          h(
            'button',
            {
              type: 'button',
              className: 'agn-kindcaret',
              'aria-label': t('kindCollapse'),
              onClick: () => onOpen(false),
            },
            h(Glyph, { name: 'chevronUp', size: 12 }),
          ),
        ),
      );
    }

    function NoteCard({ note, t, now, openRange, kindOpen, flash, onText, onPatch, onRemove, onToggleRange, onQuick, onSetKindOpen }) {
      const status = noteStatus(note, now);
      const hasRange = !!rangeStart(note);
      const kind = normalizeKind(note.kind);
      return h(
        'article',
        {
          className: 'agn-note',
          'data-kind': kind,
          'data-done': status === 'ended' ? 'true' : 'false',
          'data-flash': flash ? 'true' : 'false',
          'data-note': note.id,
        },
        h(
          'div',
          { className: 'agn-note-top' },
          h(KindPicker, {
            kind,
            t,
            open: kindOpen,
            onOpen: (next, picked) => {
              if (picked && picked !== kind) onPatch({ kind: picked });
              onSetKindOpen(next);
            },
          }),
          /* Time display sits directly right of the category. It shrinks with an
             ellipsis instead of pushing the two actions at the far right, and it
             steps aside while the category options are open. */
          kindOpen
            ? null
            : h(
                'span',
                { className: 'agn-badge', 'data-status': status, 'data-kind': kind, 'data-tip': rangeText(note, t) },
                h('span', { className: 'agn-dotkind', 'data-kind': kind }),
                h('span', { className: 'agn-badge-text' }, rangeText(note, t)),
              ),
          h('span', { className: 'agn-spacer' }),
          h(
            'div',
            { className: 'agn-note-actions' },
            h(IconButton, {
              icon: 'clock',
              label: openRange ? t('closeRange') : hasRange ? t('editRange') : t('markRange'),
              onClick: onToggleRange,
            }),
            h(IconButton, { icon: 'trash', label: t('delete'), tone: 'danger', align: 'end', onClick: onRemove }),
          ),
        ),
        h(NoteTextarea, { note, t, onText }),
        openRange
          ? h(
              'div',
              { className: 'agn-range' },
              h(
                'div',
                { className: 'agn-range-row' },
                h(
                  'label',
                  { className: 'agn-field' },
                  h('span', null, t('start')),
                  h('input', {
                    className: 'agn-input',
                    type: 'datetime-local',
                    value: toInput(note.startAt),
                    /* the picker cannot offer an end before the start */
                    max: toInput(note.endAt) || undefined,
                    onChange: (event) => {
                      const iso = fromInput(event.currentTarget.value);
                      /* an empty or half-typed value keeps the stored start; use 清除时间 to drop it */
                      if (iso) onPatch({ startAt: iso });
                    },
                  }),
                ),
                h(
                  'label',
                  { className: 'agn-field' },
                  h('span', null, t('end')),
                  h('input', {
                    className: 'agn-input',
                    type: 'datetime-local',
                    value: toInput(note.endAt),
                    min: toInput(note.startAt) || undefined,
                    onChange: (event) => onPatch({ endAt: fromInput(event.currentTarget.value) }),
                  }),
                ),
              ),
              h(
                'div',
                { className: 'agn-range-row' },
                h('button', { type: 'button', className: 'agn-tool', onClick: () => onQuick('now') }, t('quickNow')),
                h('button', { type: 'button', className: 'agn-tool', onClick: () => onQuick('hour') }, t('quickHour')),
                h('button', { type: 'button', className: 'agn-tool', onClick: () => onQuick('workday') }, t('quickToday')),
                h('button', { type: 'button', className: 'agn-tool', onClick: () => onQuick('clear') }, t('clearRange')),
              ),
            )
          : null,
      );
    }

    function Timeline({ notes, day, t, onPick, onDay, strip }) {
      const today = startOfDay(new Date());
      const dayStart = startOfDay(day).getTime();
      const dayId = dayKey(day);
      const now = Date.now();
      const lanes = { work: [], personal: [] };
      notes.forEach((note) => {
        const s = rangeStart(note);
        if (!s) return;
        /* an entry belongs to the date it is set for: its start date */
        if (dayKey(s) !== dayId) return;
        const e = rangeEnd(note) || s;
        const startMs = Math.max(s.getTime(), dayStart);
        /* a range that runs past midnight is drawn clipped at the day border */
        const endMs = Math.min(Math.max(e.getTime(), s.getTime() + 60000), dayStart + DAY_MS);
        const kind = normalizeKind(note.kind);
        const left = ((startMs - dayStart) / DAY_MS) * 100;
        const width = Math.max(((endMs - startMs) / DAY_MS) * 100, 0.8);
        lanes[kind].push(
          h('button', {
            key: note.id,
            type: 'button',
            className: 'agn-bar',
            'data-kind': kind,
            'data-lane': kind,
            style: {
              left: `${left}%`,
              width: `${width}%`,
              '--agn-bar': kind === 'work' ? 'var(--agn-work)' : 'var(--agn-personal)',
            },
            'data-clip': s.getTime() < dayStart ? 'start' : e.getTime() > dayStart + DAY_MS ? 'end' : 'none',
            'data-tip': `${kindLabelOf(kind, t)} · ${rangeText(note, t)}`,
            'aria-label': `${t('focus')}: ${kindLabelOf(kind, t)} · ${rangeText(note, t)}`,
            onClick: () => onPick(note.id),
          }),
        );
      });
      const total = lanes.work.length + lanes.personal.length;
      const isToday = dayKey(day) === dayKey(today);
      const nowLeft = ((now - dayStart) / DAY_MS) * 100;
      return h(
        'div',
        { className: 'agn-tl' },
        h(
          'div',
          { className: 'agn-tl-top' },
          h(
            'span',
            { className: 'agn-legend' },
            KINDS.map((each) =>
              h(
                'span',
                { key: each, className: 'agn-legend-item' },
                h('span', { className: 'agn-dotkind', 'data-kind': each }),
                kindLabelOf(each, t),
              ),
            ),
          ),
          h('span', { className: 'agn-spacer' }),
          h(
            Tip,
            { label: t('prevDay') },
            h(
              'button',
              { type: 'button', className: 'agn-tool', 'aria-label': t('prevDay'), onClick: () => onDay(addDays(day, -1)) },
              h(Glyph, { name: 'chevronLeft', size: 14 }),
            ),
          ),
          h('input', {
            className: 'agn-date',
            type: 'date',
            value: dayKey(day),
            'aria-label': t('timelineLabel'),
            onChange: (event) => onDay(parseDayKey(event.currentTarget.value)),
          }),
          h(
            Tip,
            { label: t('nextDay'), align: 'end' },
            h(
              'button',
              { type: 'button', className: 'agn-tool', 'aria-label': t('nextDay'), onClick: () => onDay(addDays(day, 1)) },
              h(Glyph, { name: 'chevronRight', size: 14 }),
            ),
          ),
        ),
        /* the clock button hides the 24h strip only: the date navigation above
           it must stay, otherwise the shown day could no longer be changed */
        strip
          ? h(
              'div',
              { className: 'agn-strip' },
              [0, 3, 6, 9, 12, 15, 18, 21].map((hour) =>
                h('span', { key: `g${hour}`, className: 'agn-grid', style: { left: `${(hour / 24) * 100}%` } }),
              ),
              h('span', { className: 'agn-lane-rule' }),
              lanes.work,
              lanes.personal,
              [0, 6, 12, 18, 24].map((hour) =>
                h(
                  'span',
                  { key: `l${hour}`, className: 'agn-grid-label', style: { left: `${(hour / 24) * 100}%` } },
                  `${pad2(hour === 24 ? 0 : hour)}`,
                ),
              ),
              total ? null : h('span', { className: 'agn-tl-empty' }, t('timelineEmpty')),
              isToday && nowLeft >= 0 && nowLeft <= 100
                ? h('span', { className: 'agn-now', style: { left: `${nowLeft}%` } })
                : null,
            )
          : null,
      );
    }

    /* ------------------------------------------------------------- schedule */

    /* Locale resolution. This plugin can activate before the locale service
       registers (it is an `immediately` client half), so the service is looked
       up lazily and retried instead of being cached once at apply() time — that
       race is what used to leave the UI in English after a reopen. */
    let localeCtx = null;
    let localeFace = null;

    function resolveLocaleFace() {
      if (localeFace) return localeFace;
      if (!localeCtx || typeof localeCtx.get !== 'function') return null;
      try {
        const face = localeCtx.get('locale');
        if (face && typeof face.getLocale === 'function') localeFace = face;
      } catch (error) {
        /* not registered yet: try again on the next read */
      }
      return localeFace;
    }

    function browserLang() {
      try {
        const tags = navigator && navigator.languages && navigator.languages.length
          ? navigator.languages
          : [navigator && navigator.language];
        for (const tag of tags) {
          if (typeof tag === 'string' && tag) return pickLang(tag);
        }
      } catch (error) {
        /* no navigator: fall through */
      }
      try {
        const declared = document && document.documentElement && document.documentElement.getAttribute('lang');
        if (declared) return pickLang(declared);
      } catch (error) {
        /* no document: fall through */
      }
      return 'en';
    }

    function currentLang() {
      const face = resolveLocaleFace();
      if (face) {
        try {
          const snapshot = face.getLocale();
          const active = snapshot && snapshot.active;
          if (typeof active === 'string' && active) return pickLang(active);
        } catch (error) {
          localeFace = null; /* service went away: re-resolve next time */
        }
      }
      return browserLang();
    }

    function useLang() {
      const [lang, setLang] = useState(currentLang);
      useEffect(() => {
        let off = null;
        let timer = null;
        let tries = 0;
        const sync = () => setLang(currentLang());
        const attach = () => {
          const face = resolveLocaleFace();
          sync();
          if (!face) return false;
          if (typeof face.subscribe === 'function' && !off) {
            const disposer = face.subscribe(sync);
            off = typeof disposer === 'function' ? disposer : null;
          }
          return true;
        };
        if (!attach()) {
          timer = window.setInterval(() => {
            tries += 1;
            if (attach() || tries > 40) {
              window.clearInterval(timer);
              timer = null;
            }
          }, 250);
        }
        return () => {
          if (timer) window.clearInterval(timer);
          if (typeof off === 'function') off();
        };
      }, []);
      return lang;
    }

    /* Holiday data: seed from the on-disk cache on first render, then refresh in
       the background for the years the widget can show. Returns a revision that
       ticks when fresh data arrived, so dependent views re-render. */
    function useHolidaySync(day) {
      const [rev, setRev] = useState(() => {
        loadHolidayCache();
        return 0;
      });
      useEffect(() => {
        let cancelled = false;
        const years = [parseDayKey(day).getFullYear(), new Date().getFullYear()];
        Promise.resolve()
          .then(() => syncHolidays(years))
          .then((changed) => {
            if (changed && !cancelled) setRev((value) => value + 1);
          })
          .catch(() => {
            /* offline or blocked: the embedded table stays authoritative */
          });
        return () => {
          cancelled = true;
        };
      }, [day]);
      return rev;
    }

    function Notepad() {
      const lang = useLang();
      const t = useCallback((key) => translate(lang, key), [lang]);
      const [state, setState] = useState(loadState);
      const [openRange, setOpenRange] = useState(null);
      const [openKind, setOpenKind] = useState(null);
      const [flashId, setFlashId] = useState(null);
      const [dragging, setDragging] = useState(false);
      const [armedClear, setArmedClear] = useState(false);
      const [tick, setTick] = useState(() => Date.now());

      const panelRef = useRef(null);
      const dragRef = useRef(null);
      const tipRef = useRef(null);
      const tipAnchor = useRef(null);
      const rootRef = useRef(null);
      const wantAnchor = useRef(false);

      const { notes, panel, mode, timeline, day, preset, doneOrder } = state;
      /* bumped after a holiday sync so headings and badges pick the new data up */
      const holidayRev = useHolidaySync(day);

      /* persist (debounced so typing does not write on every keystroke) */
      useEffect(() => {
        const id = window.setTimeout(() => saveState(state), 320);
        return () => window.clearTimeout(id);
      }, [state]);

      /* keep the clock fresh for status chips, the now marker and day rollover */
      useEffect(() => {
        const id = window.setInterval(() => setTick(Date.now()), 30000);
        return () => window.clearInterval(id);
      }, []);

      /* clamp the panel inside the viewport */
      useEffect(() => {
        const onResize = () => {
          setState((prev) => {
            if (prev.panel.x === null || prev.panel.y === null) return prev;
            const x = clamp(prev.panel.x, EDGE, Math.max(EDGE, window.innerWidth - 80));
            const y = clamp(prev.panel.y, EDGE, Math.max(EDGE, window.innerHeight - 60));
            if (x === prev.panel.x && y === prev.panel.y) return prev;
            return { ...prev, panel: { ...prev.panel, x, y } };
          });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      useEffect(() => {
        if (!armedClear) return undefined;
        const id = window.setTimeout(() => setArmedClear(false), 3200);
        return () => window.clearTimeout(id);
      }, [armedClear]);

      /* ------------------------------------------------------------ actions */

      const patch = useCallback((next) => {
        setState((prev) => ({ ...prev, ...(typeof next === 'function' ? next(prev) : next) }));
      }, []);

      const addNote = useCallback(() => {
        const start = new Date();
        const end = new Date(start.getTime() + 3600000);
        const note = {
          id: newId(),
          text: '',
          kind: 'work',
          startAt: isoAt(start),
          endAt: isoAt(end),
          createdAt: isoAt(start),
          updatedAt: isoAt(start),
        };
        setOpenRange(note.id);
        setOpenKind(null);
        setState((prev) => ({ ...prev, notes: [note, ...prev.notes], mode: 'expanded', day: dayKey(start) }));
      }, []);

      const patchNote = useCallback((id, changes) => {
        setState((prev) => ({
          ...prev,
          notes: prev.notes.map((note) => {
            if (note.id !== id) return note;
            const merged = { ...note, ...changes, updatedAt: new Date().toISOString() };
            const range = orderRange(merged.startAt, merged.endAt);
            return { ...merged, startAt: range.startAt, endAt: range.endAt };
          }),
        }));
      }, []);

      const removeNote = useCallback((id) => {
        setState((prev) => ({ ...prev, notes: prev.notes.filter((note) => note.id !== id) }));
        setOpenRange((current) => (current === id ? null : current));
        setOpenKind((current) => (current === id ? null : current));
      }, []);

      const quickRange = useCallback(
        (id, kind) => {
          if (kind === 'clear') {
            patchNote(id, { startAt: null, endAt: null });
            return;
          }
          const now = new Date();
          if (kind === 'now') {
            patchNote(id, { startAt: isoAt(now), endAt: isoAt(new Date(now.getTime() + 3600000)) });
            return;
          }
          if (kind === 'hour') {
            const base = rangeStart(notes.find((note) => note.id === id) || {}) || now;
            patchNote(id, { startAt: isoAt(base), endAt: isoAt(new Date(base.getTime() + 3600000)) });
            return;
          }
          if (kind === 'workday') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0);
            patchNote(id, { startAt: isoAt(start), endAt: isoAt(end) });
          }
        },
        [notes, patchNote],
      );

      const focusNote = useCallback((id) => {
        setFlashId(id);
        window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 2600);
        const node = rootRef.current && rootRef.current.querySelector(`[data-note="${id}"]`);
        if (node && typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, []);

      /* Expand into the free room around the current widget: the panel keeps the
         corner that is already near a screen edge and grows towards the side with
         more space, so it never opens off-screen or on top of the widget itself. */
      const expandTo = useCallback((want) => {
        const el = panelRef.current;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rect = el ? el.getBoundingClientRect() : null;
        setState((prev) => {
          const target = want || PRESETS[prev.preset] || PRESETS[1];
          if (!rect) return { ...prev, mode: 'expanded' };
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const toLeft = centerX >= vw / 2;
          const toTop = centerY >= vh / 2;
          const roomW = toLeft ? rect.right - EDGE : vw - rect.left - EDGE;
          const roomH = toTop ? rect.bottom - EDGE : vh - rect.top - EDGE;
          const limitW = Math.max(MIN_W, Math.min(MAX_W, vw - 2 * EDGE));
          const limitH = Math.max(MIN_H, Math.min(MAX_H, vh - 2 * EDGE));
          const w = clamp(Math.min(target.w, Math.max(roomW, MIN_W)), MIN_W, limitW);
          const h = clamp(Math.min(target.h, Math.max(roomH, MIN_H)), MIN_H, limitH);
          const x = clamp(toLeft ? rect.right - w : rect.left, EDGE, Math.max(EDGE, vw - w - EDGE));
          const y = clamp(toTop ? rect.bottom - h : rect.top, EDGE, Math.max(EDGE, vh - h - EDGE));
          return { ...prev, mode: 'expanded', corner: { h: toLeft ? 'right' : 'left', v: toTop ? 'bottom' : 'top' }, panel: { ...prev.panel, w, h, x, y } };
        });
      }, []);

      /* Collapse back onto the corner the panel grew from, so shrinking never
         teleports the widget to the far side of the panel. */
      const collapseTo = useCallback((nextMode) => {
        wantAnchor.current = true;
        setState((prev) => ({ ...prev, mode: nextMode }));
      }, []);

      useEffect(() => {
        if (mode === 'expanded' || !wantAnchor.current) return undefined;
        wantAnchor.current = false;
        const el = panelRef.current;
        if (!el) return undefined;
        const rect = el.getBoundingClientRect();
        patch((prev) => {
          if (prev.panel.x === null || prev.panel.y === null) return prev;
          const wantedX = prev.corner.h === 'left' ? prev.panel.x : prev.panel.x + prev.panel.w - rect.width;
          const wantedY = prev.corner.v === 'top' ? prev.panel.y : prev.panel.y + prev.panel.h - rect.height;
          const x = clamp(wantedX, EDGE, Math.max(EDGE, window.innerWidth - rect.width - EDGE));
          const y = clamp(wantedY, EDGE, Math.max(EDGE, window.innerHeight - rect.height - EDGE));
          if (Math.abs(x - prev.panel.x) < 1 && Math.abs(y - prev.panel.y) < 1) return prev;
          return { ...prev, panel: { ...prev.panel, x, y } };
        });
        return undefined;
      }, [mode, patch]);

      const cyclePreset = useCallback(() => {
        const index = (preset + 1) % PRESETS.length;
        setState((prev) => ({ ...prev, preset: index }));
        expandTo(PRESETS[index]);
      }, [preset, expandTo]);

      /* --------------------------------------------------------- drag/resize */

      const beginDrag = useCallback(
        (event) => {
          if (event.button !== 0) return;
          if (event.target.closest && event.target.closest('button,input,textarea,select,a')) return;
          const el = panelRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          dragRef.current = {
            kind: 'move',
            id: event.pointerId,
            dx: event.clientX - rect.left,
            dy: event.clientY - rect.top,
            w: rect.width,
            h: rect.height,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
          };
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch (error) {
            /* capture is best-effort */
          }
          el.style.userSelect = 'none';
          setDragging(true);
        },
        [],
      );

      const beginResize = useCallback((event, dir) => {
        if (event.button !== 0) return;
        const el = panelRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        dragRef.current = {
          kind: 'resize',
          dir: dir || 'se',
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x0: rect.left,
          y0: rect.top,
          w0: rect.width,
          h0: rect.height,
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          moved: false,
        };
        /* Freeze the geometry in explicit left/top so a north or west drag can
           move the panel while the opposite edge stays put. */
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (error) {
          /* capture is best-effort */
        }
        el.style.userSelect = 'none';
        setDragging(true);
      }, []);

      const onPointerMove = useCallback((event) => {
        const data = dragRef.current;
        if (!data || data.id !== event.pointerId) return;
        const el = panelRef.current;
        if (!el) return;
        if (Math.abs(event.clientX - (data.startX || 0)) + Math.abs(event.clientY - (data.startY || 0)) > 4) {
          data.moved = true;
        }
        if (data.kind === 'move') {
          const x = clamp(event.clientX - data.dx, EDGE, Math.max(EDGE, window.innerWidth - Math.min(data.w, window.innerWidth) - EDGE));
          const y = clamp(event.clientY - data.dy, EDGE, Math.max(EDGE, window.innerHeight - 48));
          data.x = x;
          data.y = y;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.right = 'auto';
          el.style.bottom = 'auto';
          return;
        }
        /* Resize: each direction moves only its own edges, and a moving edge
           stops at the viewport border instead of pushing the fixed edge. */
        const dir = data.dir;
        const dx = event.clientX - data.startX;
        const dy = event.clientY - data.startY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let w = data.w0;
        let h = data.h0;
        let x = data.x0;
        let y = data.y0;
        if (dir.indexOf('e') >= 0) {
          const limit = Math.min(MAX_W, Math.max(data.w0, vw - data.x0 - EDGE));
          w = clamp(data.w0 + dx, MIN_W, limit);
        }
        if (dir.indexOf('w') >= 0) {
          const limit = Math.min(MAX_W, Math.max(data.w0, data.x0 + data.w0 - EDGE));
          w = clamp(data.w0 - dx, MIN_W, limit);
          x = data.x0 + (data.w0 - w); /* the east edge stays put */
        }
        if (dir.indexOf('s') >= 0) {
          const limit = Math.min(MAX_H, Math.max(data.h0, vh - data.y0 - EDGE));
          h = clamp(data.h0 + dy, MIN_H, limit);
        }
        if (dir.indexOf('n') >= 0) {
          const limit = Math.min(MAX_H, Math.max(data.h0, data.y0 + data.h0 - EDGE));
          h = clamp(data.h0 - dy, MIN_H, limit);
          y = data.y0 + (data.h0 - h); /* the south edge stays put */
        }
        x = clamp(x, EDGE, Math.max(EDGE, vw - w - EDGE));
        y = clamp(y, EDGE, Math.max(EDGE, vh - h - EDGE));
        data.x = x;
        data.y = y;
        data.w = w;
        data.h = h;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }, []);

      const endPointer = useCallback(
        (event) => {
          const data = dragRef.current;
          if (!data || data.id !== event.pointerId) return;
          dragRef.current = null;
          if (panelRef.current) panelRef.current.style.userSelect = '';
          setDragging(false);
          if (data.kind === 'move') {
            if (data.moved && Number.isFinite(data.x)) {
              patch((prev) => {
                /* remember which panel corner sits nearest a screen edge, so a
                   later collapse puts the small widget there. */
                const corner = prev.mode === 'expanded'
                  ? {
                      h: data.x + data.w / 2 >= window.innerWidth / 2 ? 'right' : 'left',
                      v: data.y + data.h / 2 >= window.innerHeight / 2 ? 'bottom' : 'top',
                    }
                  : prev.corner;
                return { ...prev, corner, panel: { ...prev.panel, x: data.x, y: data.y } };
              });
            } else if (mode !== 'expanded') {
              expandTo();
            }
          } else if (Number.isFinite(data.w)) {
            patch((prev) => {
              const corner = {
                h: data.x + data.w / 2 >= window.innerWidth / 2 ? 'right' : 'left',
                v: data.y + data.h / 2 >= window.innerHeight / 2 ? 'bottom' : 'top',
              };
              return { ...prev, corner, panel: { ...prev.panel, w: data.w, h: data.h, x: data.x, y: data.y } };
            });
          }
        },
        [mode, patch, expandTo],
      );

      /* ---------------------------------------------------------- tooltips */

      const hideTip = useCallback(() => {
        tipAnchor.current = null;
        const node = tipRef.current;
        if (node) node.setAttribute('data-visible', 'false');
      }, []);

      /* Place the shared tip so it always opens towards the INSIDE of the
         interface: a control in the upper half gets its label below, a control
         in the lower half gets it above, and horizontally it grows towards the
         interior (left-side controls grow right, right-side controls grow left,
         centred controls stay centred). The viewport clamp is only a safety net
         for very long labels. */
      const showTipFor = useCallback(
        (anchor) => {
          const node = tipRef.current;
          if (!node || !anchor) return;
          const text = anchor.getAttribute('data-tip');
          if (!text) return;
          tipAnchor.current = anchor;
          node.textContent = text;
          const rect = anchor.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const margin = 8;
          const gap = 8;
          const tw = node.offsetWidth;
          const th = node.offsetHeight;
          const panel = panelRef.current;
          const frame = mode === 'expanded' && panel
            ? panel.getBoundingClientRect()
            : { left: 0, top: 0, right: vw, bottom: vh };
          const frameX = (frame.left + frame.right) / 2;
          const frameY = (frame.top + frame.bottom) / 2;
          const anchorX = rect.left + rect.width / 2;
          const anchorY = rect.top + rect.height / 2;
          /* vertical: the label goes to the side that points into the frame */
          let top = anchorY < frameY ? rect.bottom + gap : rect.top - gap - th;
          /* horizontal: grow towards the interior, stay centred when centred */
          let left;
          if (Math.abs(anchorX - frameX) < Math.max(24, rect.width)) left = anchorX - tw / 2;
          else if (anchorX < frameX) left = rect.left;
          else left = rect.right - tw;
          top = clamp(top, margin, Math.max(margin, vh - th - margin));
          left = clamp(left, margin, Math.max(margin, vw - tw - margin));
          node.style.transform = `translate(${Math.round(left)}px,${Math.round(top)}px)`;
          node.setAttribute('data-visible', 'true');
        },
        [mode],
      );

      const resolveTipAnchor = useCallback((target) => {
        if (!target || typeof target.closest !== 'function') return null;
        return target.closest('[data-tip]');
      }, []);

      const onTipOver = useCallback(
        (event) => {
          const anchor = resolveTipAnchor(event.target);
          if (!anchor || tipAnchor.current === anchor) return;
          showTipFor(anchor);
        },
        [resolveTipAnchor, showTipFor],
      );

      const onTipOut = useCallback(
        (event) => {
          const anchor = tipAnchor.current;
          if (!anchor) return;
          const next = event.relatedTarget;
          if (next && anchor.contains(next)) return;
          hideTip();
        },
        [hideTip],
      );

      const onTipFocus = useCallback(
        (event) => {
          const anchor = resolveTipAnchor(event.target);
          if (anchor) showTipFor(anchor);
        },
        [resolveTipAnchor, showTipFor],
      );

      /* A moving anchor invalidates the placement: scrolling, resizing or a
         layout switch hides the tip instead of leaving it stranded. */
      useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        const onScroll = () => hideTip();
        root.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);
        window.addEventListener('blur', onScroll);
        return () => {
          root.removeEventListener('scroll', onScroll, true);
          window.removeEventListener('resize', onScroll);
          window.removeEventListener('blur', onScroll);
        };
      }, [hideTip]);

      useEffect(() => {
        hideTip();
      }, [mode, hideTip]);


      const now = tick;

      /* An entry is shown on exactly one date: the date its own start time is
         set for. A range that crosses midnight is not repeated on the next day.
         The timeline strip uses the same rule, so a bar you can see is always
         an entry you can read in the list. */
      const dayNotes = useMemo(() => {
        const wanted = dayKey(parseDayKey(day));
        return notes
          .filter((note) => {
            const s = rangeStart(note);
            return !!s && dayKey(s) === wanted;
          })
          .sort((a, b) => rangeStart(a).getTime() - rangeStart(b).getTime());
      }, [notes, day]);

      const groups = useMemo(() => {
        const today = startOfDay(new Date());
        const untimed = notes
          .filter((note) => !rangeStart(note))
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        const direction = doneOrder === 'desc' ? -1 : 1;
        /* The list is always exactly the date the picker shows: unfinished
           entries first in start order, then the finished ones ordered by
           completion time in the direction the user picked. */
        const split = (list) => {
          const active = [];
          const done = [];
          list.forEach((note) => (isDone(note, now) ? done : active).push(note));
          done.sort((a, b) => (completedAt(a) - completedAt(b)) * direction);
          return { active, done };
        };
        const out = [];
        const parts = split(dayNotes);
        if (parts.active.length || parts.done.length) {
          out.push({ key: day, label: dayLabel(parseDayKey(day), today, t), ...parts });
        }
        /* Untimed entries have no date of their own, so they only ride along on
           today's page instead of appearing under every date. */
        const isToday = dayKey(parseDayKey(day)) === dayKey(new Date());
        if (untimed.length && isToday) {
          out.push({ key: '__untimed__', label: t('untimed'), active: untimed, done: [] });
        }
        return out;
      }, [notes, dayNotes, day, t, now, doneOrder, lang, holidayRev]);

      /* -------------------------------------------------------------- render */

      const anchored = panel.x === null || panel.y === null;
      const today = startOfDay(new Date());
      /* Holiday / make-up-workday chip for the day on show; plain weekends are
         already spelled out by the weekday text next to it. */
      const dayMark = dayBadge(parseDayKey(day), lang, t);
      const headerBadge = dayMark && dayMark.tone !== 'weekend' ? dayMark : null;
      /* Lunar date and solar term for the day on show (lines under the title). */
      const dayDate = parseDayKey(day);
      const lunar = solarToLunar(dayDate);
      const term = solarTermOf(dayDate);
      const termNext = term ? null : nextSolarTerm(dayDate);
      const lunarLine = lunar ? [lunarText(lunar, lang), term ? term.name : null].filter(Boolean).join(' · ') : '';
      const lunarTip = lunar
        ? [
            lunarText(lunar, lang),
            term
              ? `${t('solarTerm')} ${term.name}`
              : termNext
                ? `${t('nextTerm')} ${termNext.name} ${fmtDate(termNext.date)}`
                : '',
          ]
            .filter(Boolean)
            .join(' · ')
        : '';
      /* What the shrunk widget advertises: the nearest unfinished entry. */
      const pending = useMemo(() => nextPending(notes, now), [notes, now]);
      const pendingKind = pending ? normalizeKind(pending.kind) : null;
      const pendingTime = pending ? compactRange(pending, today, t) : '';
      const pendingText = pending ? pending.text || t('untitled') : t('noPending');
      const orbTip = pending
        ? `${t('orbHint')} · ${t('nextHint')} ${pendingTime} ${pendingText}`
        : `${t('orbHint')} · ${t('noPending')}`;

      /* Shared tooltip plumbing: every branch renders the same root handlers and
         one shared tip element, so a label can be placed anywhere on screen. */
      const rootProps = {
        className: 'agn-root',
        ref: rootRef,
        onPointerOver: onTipOver,
        onPointerOut: onTipOut,
        onFocusIn: onTipFocus,
        onFocusOut: hideTip,
        onPointerDown: hideTip,
        onKeyDown: hideTip,
      };
      const tipNode = h('div', {
        className: 'agn-tip',
        ref: tipRef,
        role: 'tooltip',
        'aria-hidden': 'true',
        'data-visible': 'false',
      });

      if (mode === 'orb') {
        return h(
          'div',
          rootProps,
          h(
            'div',
            {
              ref: panelRef,
              className: 'agn-surface agn-orb agn-pop',
              role: 'button',
              tabIndex: 0,
              'aria-label': t('orbOpen'),
              'data-tip': orbTip,
              style: anchored ? { right: 22, bottom: 22 } : { left: panel.x, top: panel.y },
              onPointerDown: beginDrag,
              onPointerMove,
              onPointerUp: endPointer,
              onPointerCancel: endPointer,
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  expandTo();
                }
              },
            },
            h(Glyph, { name: 'list', size: 20 }),
            pending ? h('span', { className: 'agn-orb-dot', 'data-kind': pendingKind }) : null,
          ),
          tipNode,
        );
      }

      if (mode === 'collapsed') {
        return h(
          'div',
          rootProps,
          h(
            'div',
            {
              ref: panelRef,
              className: 'agn-surface agn-pill agn-pop',
              role: 'button',
              tabIndex: 0,
              'aria-label': t('expand'),
              'data-tip': t('pillHint'),
              style: anchored ? { right: 22, bottom: 22 } : { left: panel.x, top: panel.y },
              onPointerDown: beginDrag,
              onPointerMove,
              onPointerUp: endPointer,
              onPointerCancel: endPointer,
              onDoubleClick: () => expandTo(),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  expandTo();
                }
              },
            },
            h(Glyph, { name: 'list', size: 18 }),
            h(
              'div',
              { className: 'agn-titles' },
              pending
                ? h(
                    'span',
                    { className: 'agn-title agn-next-time' },
                    h('span', { className: 'agn-dotkind', 'data-kind': pendingKind }),
                    h('span', { className: 'agn-next-text' }, pendingTime),
                  )
                : h('span', { className: 'agn-title' }, t('title')),
              h('span', { className: 'agn-sub' }, pendingText),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'agn-btn',
                'aria-label': t('expand'),
                onClick: (event) => {
                  event.stopPropagation();
                  expandTo();
                },
              },
              h(Glyph, { name: 'chevronUp', size: 16 }),
            ),
          ),
          tipNode,
        );
      }

      return h(
        'div',
        rootProps,
        h(
          'section',
          {
            ref: panelRef,
            className: 'agn-surface agn-panel agn-pop',
            style: {
              width: panel.w,
              height: panel.h,
              ...(anchored ? { right: 22, bottom: 22 } : { left: panel.x, top: panel.y }),
            },
            'data-dragging': dragging ? 'true' : 'false',
            role: 'dialog',
            'aria-label': t('title'),
          },
          h(
            'header',
            {
              className: 'agn-head',
              onPointerDown: beginDrag,
              onPointerMove,
              onPointerUp: endPointer,
              onPointerCancel: endPointer,
              onDoubleClick: () => collapseTo('collapsed'),
            },
            h('span', { className: 'agn-dot' }),
            h(
              'div',
              { className: 'agn-titles' },
              h('span', { className: 'agn-title' }, t('title')),
              /* Date + weekday of the day being shown, right beside the size
                 control on the same header row. */
              h('span', { className: 'agn-sub' }, dayHeading(parseDayKey(day), today, lang, t)),
              lunarLine ? h('span', { className: 'agn-sub agn-sub-alt', 'data-tip': lunarTip }, lunarLine) : null,
            ),
            h(
              'div',
              { className: 'agn-actions' },
              headerBadge
                ? h(
                    'span',
                    {
                      className: 'agn-daybadge',
                      'data-tone': headerBadge.tone,
                      'data-tip': `${headerBadge.label} · ${t('holidayFrom')}`,
                    },
                    headerBadge.label,
                  )
                : null,
              h(
                Tip,
                { label: `${t('preset')} · ${[t('presetMedium'), t('presetLarge')][preset]}` },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'agn-btn',
                    'aria-label': t('preset'),
                    onClick: cyclePreset,
                  },
                  h(Glyph, { name: 'resize', size: 16 }),
                ),
              ),
              h(
                Tip,
                { label: t('collapse') },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'agn-btn',
                    'aria-label': t('collapse'),
                    onClick: () => collapseTo('collapsed'),
                  },
                  h(Glyph, { name: 'chevronDown', size: 16 }),
                ),
              ),
              h(
                Tip,
                { label: t('orb'), align: 'end' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'agn-btn',
                    'aria-label': t('orb'),
                    onClick: () => collapseTo('orb'),
                  },
                  h(Glyph, { name: 'minus', size: 16 }),
                ),
              ),
            ),
          ),
          h(
            'div',
            { className: 'agn-fixed' },
            h(
              'div',
              { className: 'agn-tools' },
              h(
                Tip,
                { label: `${t('newNote')} · ${t('markRange')}` },
                h(
                  'button',
                  { type: 'button', className: 'agn-primary', 'data-icon': 'true', 'aria-label': t('newNote'), onClick: addNote },
                  h(Glyph, { name: 'plus', size: 16 }),
                ),
              ),
              h('span', { className: 'agn-spacer' }),
              h(
                Tip,
                { label: doneOrder === 'asc' ? t('sortDoneAsc') : t('sortDoneDesc'), align: 'end' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'agn-tool',
                    'data-icon': 'true',
                    'aria-label': doneOrder === 'asc' ? t('sortDoneAsc') : t('sortDoneDesc'),
                    onClick: () => patch((prev) => ({ ...prev, doneOrder: prev.doneOrder === 'asc' ? 'desc' : 'asc' })),
                  },
                  h(Glyph, { name: doneOrder === 'asc' ? 'arrowUp' : 'arrowDown', size: 15 }),
                ),
              ),
              h(
                Tip,
                { label: timeline ? t('timelineOn') : t('timelineOff'), align: 'end' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'agn-tool',
                    'data-icon': 'true',
                    'data-on': timeline ? 'true' : 'false',
                    'aria-label': timeline ? t('timelineOn') : t('timelineOff'),
                    'aria-pressed': timeline,
                    onClick: () => patch((prev) => ({ ...prev, timeline: !prev.timeline })),
                  },
                  h(Glyph, { name: 'clock', size: 15 }),
                ),
              ),
            ),
            h(Timeline, {
              notes,
              day: parseDayKey(day),
              t,
              strip: timeline,
              onPick: focusNote,
              onDay: (next) => patch({ day: dayKey(next) }),
            }),
          ),
          h(
            'div',
            { className: 'agn-body' },
            groups.length
              ? groups.map((group) => {
                  const card = (note) =>
                    h(NoteCard, {
                      key: note.id,
                      note,
                      t,
                      now,
                      openRange: openRange === note.id,
                      kindOpen: openKind === note.id,
                      flash: flashId === note.id,
                      onText: (value) => patchNote(note.id, { text: value }),
                      onPatch: (changes) => patchNote(note.id, changes),
                      onRemove: () => removeNote(note.id),
                      onToggleRange: () => {
                        if (!rangeStart(note)) {
                          const start = new Date();
                          patchNote(note.id, { startAt: isoAt(start), endAt: isoAt(new Date(start.getTime() + 3600000)) });
                          setOpenRange(note.id);
                        } else {
                          setOpenRange((current) => (current === note.id ? null : note.id));
                        }
                      },
                      onQuick: (kind) => quickRange(note.id, kind),
                      onSetKindOpen: (open) => setOpenKind(open ? note.id : null),
                    });
                  return h(
                    'div',
                    { key: group.key, className: 'agn-group' },
                    h(
                      'div',
                      { className: 'agn-group-head' },
                      h('strong', null, group.label),
                      h('span', { className: 'agn-rule' }),
                      h('span', null, `${group.active.length + group.done.length} ${t('count')}`),
                    ),
                    group.active.map(card),
                    group.done.length
                      ? h(
                          'div',
                          { className: 'agn-subhead' },
                          h('strong', null, t('completed')),
                          h('span', { className: 'agn-rule' }),
                          h('span', null, `${group.done.length} ${t('count')}`),
                        )
                      : null,
                    group.done.map(card),
                  );
                })
              : h('div', { className: 'agn-emptystate' }, t('emptyDay')),
            h(
              'div',
              { className: 'agn-foot' },
              h('span', null, `${notes.length} ${t('count')}`),
              h('span', { className: 'agn-rule' }),
              notes.length
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'agn-link',
                      'data-armed': armedClear ? 'true' : 'false',
                      onClick: () => {
                        if (armedClear) {
                          patch({ notes: [] });
                          setOpenRange(null);
                          setArmedClear(false);
                        } else {
                          setArmedClear(true);
                        }
                      },
                    },
                    armedClear ? t('clearAllConfirm') : t('clearAll'),
                  )
                : null,
            ),
          ),
          RESIZE_DIRS.map((dir) =>
            h(
              'div',
              {
                key: dir,
                className: 'agn-rz',
                'data-dir': dir,
                'aria-hidden': 'true',
                'data-tip': dir === 'n' || dir === 's' ? t('resizeHeight') : dir === 'w' || dir === 'e' ? t('resizeWidth') : t('resizeHint'),
                onPointerDown: (event) => beginResize(event, dir),
                onPointerMove,
                onPointerUp: endPointer,
                onPointerCancel: endPointer,
              },
            ),
          ),
          tipNode,
        ),
      );
    }

    /* ----------------------------------------------------------------- apply */

    return {
      inject: ['slots'],
      apply(ctx) {
        /* remember the context so the locale service can be resolved lazily */
        localeCtx = ctx;
        localeFace = null;
        ctx.effect(() => {
          const el = document.createElement('style');
          el.setAttribute('data-dsh-plugin', PKG);
          el.textContent = CSS;
          document.head.appendChild(el);
          return () => {
            if (el.parentNode) el.parentNode.removeChild(el);
          };
        }, `${PKG}.styles`);

        ctx.slots.inject(SLOT, () => ctx.slots.register({ name: SLOT, id: PKG, order: SLOT_ORDER }, Notepad));
      },
    };
  },
});
