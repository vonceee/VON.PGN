/**
 * Helper utilities for PCAP badge styling, category badges, and role labels.
 */

export function getPcapCategoryBadgeClass(category?: string): string {
  switch (category) {
    case 'O':
      return 'bg-amber-50 text-amber-800 border-amber-200/80';
    case 'L':
    case 'F':
      return 'bg-rose-50 text-rose-800 border-rose-200/80';
    case 'S':
      return 'bg-purple-50 text-purple-800 border-purple-200/80';
    case 'HG':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    case 'HG/S':
      return 'bg-teal-50 text-teal-800 border-teal-200/80';
    case 'HG/L':
      return 'bg-pink-50 text-pink-800 border-pink-200/80';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getPcapCategoryTooltip(category?: string): string {
  switch (category) {
    case 'O':
      return 'Open Board (B1-B2)';
    case 'L':
    case 'F':
      return 'Lady Board (B3)';
    case 'S':
      return 'Senior Board (B4)';
    case 'HG':
      return 'Homegrown Board (B5-B7)';
    case 'HG/S':
      return 'Homegrown / Senior Eligibility (B4-B7)';
    case 'HG/L':
      return 'Homegrown / Lady Eligibility (B3, B5-B7)';
    default:
      return 'Player';
  }
}

export function getPcapCategoryLabel(category?: string): string {
  switch (category) {
    case 'O':
      return 'Open • B1/B2';
    case 'L':
    case 'F':
      return 'Lady • B3';
    case 'S':
      return 'Senior • B4';
    case 'HG':
      return 'Homegrown • B5-B7';
    case 'HG/S':
      return 'Homegrown / Senior';
    case 'HG/L':
      return 'Homegrown / Lady';
    default:
      return category || 'Roster';
  }
}

export function getPcapRoleBadgeClass(role: string): string {
  switch (role) {
    case 'top_gun':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'lady':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'senior':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'homegrown':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getPcapRoleLabel(role: string): string {
  switch (role) {
    case 'top_gun':
      return 'Top Gun (Open)';
    case 'lady':
      return 'Lady Board';
    case 'senior':
      return 'Senior (60+)';
    case 'homegrown':
      return 'Homegrown';
    default:
      return 'Open';
  }
}

/**
 * Team Logo asset mappings (WebP format)
 */
export const PCAP_TEAM_LOGOS: Record<string, string> = {
  'bacolod-blitzers': 'assets/pcap/team_logo/bacolod_blitzers.webp',
  'cagayan-kings': 'assets/pcap/team_logo/cagayan_kings.webp',
  'camarines-soaring-eagles': 'assets/pcap/team_logo/camarines_soaring-eagles.webp',
  'cavite-spartans': 'assets/pcap/team_logo/cavite_spartans.webp',
  'isabela-knights': 'assets/pcap/team_logo/isabela_knights-of-alexander.webp',
  'laguna-7lakes': 'assets/pcap/team_logo/laguna_7lakes.webp',
  'manila-aq-prime': 'assets/pcap/team_logo/manila_aq-prime.webp',
  'sudeco-manila-indios-bravos': 'assets/pcap/team_logo/manila_load-manna-knights.webp',
  'manila-load-manna-knights': 'assets/pcap/team_logo/manila_load-manna-knights.webp',
  'mindoro-tamaraws': 'assets/pcap/team_logo/mindoro_tamaraws.webp',
  'pasig-king-pirates': 'assets/pcap/team_logo/pasig_king-pirates.webp',
  'quezon-city-simba': 'assets/pcap/team_logo/qc_simba-tribe.webp',
  'rizal-batch-towers': 'assets/pcap/team_logo/rizal_batch-towers.webp',
  'san-juan-predators': 'assets/pcap/team_logo/sanjuan_predators.webp',
  'toledo-xignex-trojans': 'assets/pcap/team_logo/toledo_xignex-trojans.webp',
  'zamboanga-sultans': 'assets/pcap/team_logo/zamboanga_sultans.webp'
};

/**
 * Themed ambient backdrops reflecting each team's logo identity
 */
export const PCAP_TEAM_BACKDROPS: Record<string, string> = {
  'bacolod-blitzers': 'from-rose-500/[0.08] via-indigo-500/[0.05] to-amber-500/[0.03]',
  'cagayan-kings': 'from-purple-600/[0.08] via-indigo-600/[0.04] to-amber-500/[0.04]',
  'camarines-soaring-eagles': 'from-amber-500/[0.09] via-yellow-500/[0.05] to-slate-500/[0.02]',
  'cavite-spartans': 'from-emerald-600/[0.08] via-amber-500/[0.06] to-slate-900/[0.03]',
  'isabela-knights': 'from-amber-600/[0.09] via-red-600/[0.05] to-blue-600/[0.03]',
  'laguna-7lakes': 'from-cyan-600/[0.08] via-teal-600/[0.05] to-amber-500/[0.03]',
  'manila-aq-prime': 'from-red-600/[0.09] via-rose-500/[0.05] to-transparent',
  'sudeco-manila-indios-bravos': 'from-sky-600/[0.08] via-blue-600/[0.04] to-amber-500/[0.03]',
  'mindoro-tamaraws': 'from-emerald-600/[0.09] via-teal-600/[0.05] to-amber-600/[0.03]',
  'pasig-king-pirates': 'from-blue-600/[0.09] via-sky-500/[0.06] to-slate-800/[0.03]',
  'rizal-batch-towers': 'from-blue-600/[0.07] via-rose-500/[0.05] to-amber-500/[0.04]',
  'san-juan-predators': 'from-red-700/[0.08] via-amber-500/[0.04] to-transparent',
  'quezon-city-simba': 'from-orange-600/[0.08] via-amber-500/[0.04] to-slate-700/[0.03]',
  'ocm-cebu-ninos': 'from-blue-700/[0.08] via-yellow-500/[0.04] to-transparent',
  'toledo-xignex-trojans': 'from-amber-600/[0.08] via-red-600/[0.04] to-slate-800/[0.03]',
  'manila-load-manna-knights': 'from-sky-600/[0.08] via-blue-600/[0.04] to-amber-500/[0.03]',
  'arriba-iriga-oragons': 'from-rose-600/[0.08] via-orange-500/[0.04] to-transparent',
  'zamboanga-sultans': 'from-emerald-700/[0.08] via-yellow-600/[0.04] to-transparent',
  'qc-chessmates-stallions': 'from-indigo-600/[0.08] via-sky-500/[0.04] to-slate-700/[0.03]'
};

export function getPcapTeamLogo(teamId: string): string | null {
  return PCAP_TEAM_LOGOS[teamId] || null;
}

export function getPcapTeamBackdropClass(teamId: string): string {
  return PCAP_TEAM_BACKDROPS[teamId] || 'from-slate-100/50 via-slate-50/20 to-transparent';
}

/**
 * Franchise monogram acronyms for teams without an uploaded logo
 */
export const PCAP_TEAM_MONOGRAMS: Record<string, string> = {
  'san-juan-predators': 'SJP',
  'quezon-city-simba': 'QC',
  'ocm-cebu-ninos': 'OCM',
  'toledo-xignex-trojans': 'TXT',
  'sudeco-manila-indios-bravos': 'MIB',
  'manila-load-manna-knights': 'MLM',
  'arriba-iriga-oragons': 'AIO',
  'zamboanga-sultans': 'ZS',
  'qc-chessmates-stallions': 'QCS'
};

export function getPcapTeamMonogram(teamId: string, teamName?: string): string {
  if (PCAP_TEAM_MONOGRAMS[teamId]) {
    return PCAP_TEAM_MONOGRAMS[teamId];
  }
  if (!teamName) return 'PCAP';
  const words = teamName.split(/[\s-]+/).filter(w => w.length > 0 && !/^(of|the|and|in)$/i.test(w));
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return teamName.substring(0, 3).toUpperCase();
}


