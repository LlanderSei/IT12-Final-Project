const getTimestamp = (value) => {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.getTime();
};

export const getDeliveryTimestamp = (value) => getTimestamp(value);

export const isDeliveryOverdue = (jobOrder, referenceTime = Date.now()) => {
	const timestamp = getTimestamp(jobOrder?.DeliveryAt);
	if (timestamp === null) return false;
	return timestamp < referenceTime;
};

export const countOverdueDeliveries = (rows = [], referenceTime = Date.now()) =>
	(rows || []).reduce(
		(total, row) => total + (isDeliveryOverdue(row, referenceTime) ? 1 : 0),
		0,
	);
