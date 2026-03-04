export function formatCountLabel(count, singular, plural = `${singular}s`) {
	const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
	return `${safeCount} ${safeCount === 1 ? singular : plural}`;
}
