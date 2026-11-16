/**
 * A small, strict CSV reader for LinkedIn's export files: quoted fields, commas and line
 * breaks inside quotes, "" for a quote, a byte-order mark, and Windows or Unix line ends.
 */

/** @param {string} text @returns {string[][]} every row, as a list of fields */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (source[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      endRow();
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) endRow();
  return rows.filter((fields) => fields.some((value) => value.trim() !== ''));
}

const simplify = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Turns rows into records, keeping only the columns asked for. Everything else in the file is
 * dropped on the spot, so it can never leak into a message or a saved file.
 *
 * LinkedIn sometimes puts a note above the header row, so the header is the first row that has
 * every required column. Column names are matched loosely ("Started On" = "started on").
 *
 * @param {string} text
 * @param {Record<string, string[]>} columns  field name -> accepted column names
 * @param {string[]} required  field names that must be in the header
 * @returns {Record<string, string>[] | undefined}  undefined if no header matches
 */
export function readRecords(text, columns, required) {
  const rows = parseCsv(text);
  const find = (header, names) =>
    header.findIndex((cell) => names.map(simplify).includes(simplify(cell)));

  for (let start = 0; start < Math.min(rows.length, 6); start++) {
    const header = rows[start];
    const positions = Object.fromEntries(
      Object.entries(columns).map(([field, names]) => [field, find(header, names)]),
    );
    if (required.some((field) => positions[field] === -1)) continue;
    return rows
      .slice(start + 1)
      .map((fields) =>
        Object.fromEntries(
          Object.entries(positions).map(([field, position]) => [
            field,
            position === -1 ? '' : (fields[position] ?? '').trim(),
          ]),
        ),
      );
  }
  return undefined;
}
