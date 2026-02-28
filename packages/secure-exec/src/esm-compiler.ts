function isValidIdentifier(value: string): boolean {
	return /^[$A-Z_][0-9A-Z_$]*$/i.test(value);
}

export function createBuiltinESMWrapper(
	bindingExpression: string,
	namedExports: string[],
): string {
	const exportLines = Array.from(new Set(namedExports))
		.filter(isValidIdentifier)
		.map(
			(name) =>
				`export const ${name} = _builtin == null ? undefined : _builtin[${JSON.stringify(name)}];`,
		)
		.join("\n");

	return `
      const _builtin = ${bindingExpression};
      export default _builtin;
      ${exportLines}
    `;
}
