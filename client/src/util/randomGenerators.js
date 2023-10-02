export const randomIndex = size => {
	return Math.floor(Math.random() * size);
};

export const randomUniqueIndices = (size, count) => {
	const set = new Set();
	while (set.size < count) {
		set.add(Math.floor(Math.random() * size) + 1);
	}
	return [...set];
};
