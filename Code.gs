/**
 * PMS - Production Management System
 * Google Sheets backend and API.
 *
 * Setup:
 * 1. Paste this file into Apps Script attached to your PMS Google Sheet.
 * 2. Run setupPmsSheet() once, or use PMS > Setup PMS Sheet.
 * 3. Use PMS > Set API Token and use the same token in Cloudflare.
 * 4. Deploy as a web app: execute as "Me", access "Anyone".
 */

const PMS_API_TOKEN_PROPERTY = 'PMS_API_TOKEN';

const PMS_SHEETS = [
  {
    name: 'PIs',
    idColumn: 'pi_id',
    headers: [
      'pi_id',
      'pi_no',
      'customer_id',
      'customer_name',
      'sales_manager',
      'pi_date',
      'delivery_date',
      'priority',
      'remarks',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'PI_Items',
    idColumn: 'pi_item_id',
    headers: [
      'pi_item_id',
      'source_key',
      'pi_id',
      'pi_no',
      'line_no',
      'fabric_name',
      'colour',
      'ordered_qty',
      'unit',
      'gsm',
      'width',
      'planned_qty',
      'greige_produced_qty',
      'dyeing_sent_qty',
      'dyeing_received_qty',
      'production_balance',
      'dyeing_balance',
      'final_balance',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Item_Yarns',
    idColumn: 'item_yarn_id',
    headers: [
      'item_yarn_id',
      'pi_item_id',
      'yarn_no',
      'yarn_name',
      'blend_percent',
      'required_qty',
      'stock_available_qty',
      'shortage_qty',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Greige_Lots',
    idColumn: 'greige_lot_id',
    headers: [
      'greige_lot_id',
      'source_key',
      'greige_lot_no',
      'pi_id',
      'pi_no',
      'fabric_name',
      'gsm',
      'width',
      'received_date',
      'source_type',
      'machine_no',
      'job_worker_id',
      'job_worker_name',
      'rolls',
      'weight_qty',
      'unit',
      'dyeing_sent_rolls',
      'dyeing_sent_weight',
      'balance_rolls',
      'balance_weight',
      'status',
      'remarks',
      'created_at',
    ],
  },
  {
    name: 'Dyeing_Lots',
    idColumn: 'dyeing_lot_id',
    headers: [
      'dyeing_lot_id',
      'dyeing_lot_no',
      'source_key',
      'greige_lot_id',
      'greige_lot_no',
      'pi_item_id',
      'pi_no',
      'fabric_name',
      'dyeing_party',
      'sent_date',
      'sent_rolls',
      'sent_weight',
      'colour',
      'process_type',
      'addons',
      'received_date',
      'received_rolls',
      'received_weight',
      'loss_weight',
      'status',
      'remarks',
      'created_at',
    ],
  },
  {
    name: 'Sales_PI_Import',
    idColumn: 'source_key',
    headers: [
      'source_key',
      'pi_no',
      'line_no',
      'customer_name',
      'sales_manager',
      'pi_date',
      'delivery_date',
      'priority',
      'fabric_name',
      'colour',
      'ordered_qty',
      'unit',
      'gsm',
      'width',
      'remarks',
      'import_status',
      'imported_pi_id',
      'imported_item_id',
      'imported_at',
      'import_message',
    ],
  },
  {
    name: 'Greige_Lot_Import',
    idColumn: 'source_key',
    headers: [
      'source_key',
      'greige_lot_no',
      'pi_no',
      'fabric_name',
      'gsm',
      'width',
      'received_date',
      'source_type',
      'machine_no',
      'job_worker_name',
      'rolls',
      'weight_qty',
      'unit',
      'remarks',
      'import_status',
      'imported_greige_lot_id',
      'imported_at',
      'import_message',
    ],
  },
  {
    name: 'Dyeing_Lot_Import',
    idColumn: 'source_key',
    headers: [
      'source_key',
      'greige_lot_no',
      'pi_no',
      'line_no',
      'fabric_name',
      'colour',
      'dyeing_party',
      'sent_date',
      'sent_rolls',
      'sent_weight',
      'process_type',
      'addons',
      'received_date',
      'received_rolls',
      'received_weight',
      'remarks',
      'import_status',
      'imported_dyeing_lot_id',
      'imported_at',
      'import_message',
    ],
  },
  {
    name: 'Masters_Customers',
    idColumn: 'customer_id',
    headers: [
      'customer_id',
      'customer_name',
      'contact_person',
      'phone',
      'email',
      'address',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Masters_Fabrics',
    idColumn: 'fabric_id',
    headers: [
      'fabric_id',
      'fabric_name',
      'default_gsm',
      'default_width',
      'default_unit',
      'remarks',
    ],
  },
  {
    name: 'Masters_Yarns',
    idColumn: 'yarn_id',
    headers: [
      'yarn_id',
      'yarn_name',
      'yarn_count',
      'stock_qty',
      'unit',
      'supplier',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Masters_Machines',
    idColumn: 'machine_no',
    headers: [
      'machine_no',
      'machine_name',
      'machine_type',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Masters_JobWorkers',
    idColumn: 'job_worker_id',
    headers: [
      'job_worker_id',
      'job_worker_name',
      'phone',
      'address',
      'work_type',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Masters_DyeingProcesses',
    idColumn: 'process_id',
    headers: [
      'process_id',
      'process_name',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Masters_Addons',
    idColumn: 'addon_id',
    headers: [
      'addon_id',
      'addon_name',
      'status',
      'remarks',
    ],
  },
  {
    name: 'Masters_DyeingHouses',
    idColumn: 'dyeing_house_id',
    headers: [
      'dyeing_house_id',
      'dyeing_house_name',
      'phone',
      'address',
      'status',
      'remarks',
    ],
  },
];

const PMS_SHEET_MAP = PMS_SHEETS.reduce(function (map, sheetConfig) {
  map[sheetConfig.name] = sheetConfig;
  return map;
}, {});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PMS')
    .addItem('Setup PMS Sheet', 'setupPmsSheet')
    .addItem('Import Sales PIs', 'importSalesPis')
    .addItem('Import Greige Lots', 'importGreigeLots')
    .addItem('Import Dyeing Lots', 'importDyeingLots')
    .addItem('Set API Token', 'setPmsApiToken')
    .addItem('Show Web App Help', 'showPmsWebAppHelp')
    .addToUi();
}

function setupPmsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  PMS_SHEETS.forEach(function (sheetConfig) {
    const sheet = getOrCreateSheet_(spreadsheet, sheetConfig.name);
    ensureHeaders_(sheet, sheetConfig.headers);
    formatHeader_(sheet, sheetConfig.headers.length);
  });

  seedMachines_(spreadsheet.getSheetByName('Masters_Machines'));
  seedDefaultOptions_(spreadsheet);

  SpreadsheetApp.getUi().alert('PMS tabs are ready.');
}

function importSalesPis() {
  const ui = SpreadsheetApp.getUi();

  try {
    const result = importSalesPis_();
    ui.alert(
      'Sales PI import complete.\n\n' +
      'Imported PIs: ' + result.importedPis + '\n' +
      'Imported items: ' + result.importedItems + '\n' +
      'Skipped rows: ' + result.skippedRows + '\n' +
      'Failed rows: ' + result.failedRows
    );
  } catch (error) {
    ui.alert('Sales PI import failed:\n\n' + error.message);
  }
}

function importGreigeLots() {
  const ui = SpreadsheetApp.getUi();

  try {
    const result = importGreigeLots_();
    ui.alert(
      'Greige lot import complete.\n\n' +
      'Imported lots: ' + result.importedLots + '\n' +
      'Skipped rows: ' + result.skippedRows + '\n' +
      'Failed rows: ' + result.failedRows
    );
  } catch (error) {
    ui.alert('Greige lot import failed:\n\n' + error.message);
  }
}

function importDyeingLots() {
  const ui = SpreadsheetApp.getUi();

  try {
    const result = importDyeingLots_();
    ui.alert(
      'Dyeing lot import complete.\n\n' +
      'Imported lots: ' + result.importedLots + '\n' +
      'Skipped rows: ' + result.skippedRows + '\n' +
      'Failed rows: ' + result.failedRows
    );
  } catch (error) {
    ui.alert('Dyeing lot import failed:\n\n' + error.message);
  }
}

function importSalesPis_() {
  setupPmsSheetForApi_();

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = spreadsheet.getSheetByName('Sales_PI_Import');
  const piSheet = spreadsheet.getSheetByName('PIs');
  const itemSheet = spreadsheet.getSheetByName('PI_Items');
  const headers = getHeaders_(importSheet);
  const values = importSheet.getDataRange().getValues();
  const requiredColumns = [
    'pi_no',
    'customer_name',
    'fabric_name',
    'colour',
    'ordered_qty',
  ];

  requiredColumns.forEach(function (columnName) {
    if (headers.indexOf(columnName) === -1) {
      throw new Error('Sales_PI_Import is missing column: ' + columnName);
    }
  });

  const counts = {
    ok: true,
    importedPis: 0,
    importedItems: 0,
    skippedRows: 0,
    failedRows: 0,
  };

  if (values.length < 2) {
    return counts;
  }

  const piByNo = {};
  getSheetObjects_(piSheet).forEach(function (pi) {
    piByNo[normalizeKey_(pi.pi_no)] = pi;
  });

  const sourceKeys = {};
  const naturalKeys = {};
  const lineCounters = {};
  getSheetObjects_(itemSheet).forEach(function (item) {
    if (item.source_key) {
      sourceKeys[String(item.source_key)] = true;
    }

    naturalKeys[getItemNaturalKey_(item)] = true;
    lineCounters[item.pi_id] = Math.max(lineCounters[item.pi_id] || 0, toNumber_(item.line_no));
  });

  const touchedPiIds = {};

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    const record = objectFromValues_(headers, values[rowIndex]);

    if (isBlankImportRecord_(record)) {
      continue;
    }

    if (record.import_status === 'Imported' && record.imported_item_id) {
      counts.skippedRows += 1;
      continue;
    }

    const validationMessage = validateImportRecord_(record);
    if (validationMessage) {
      writeImportResult_(importSheet, headers, rowNumber, {
        status: 'Failed',
        message: validationMessage,
      });
      counts.failedRows += 1;
      continue;
    }

    const piNoKey = normalizeKey_(record.pi_no);
    let pi = piByNo[piNoKey];

    if (!pi) {
      pi = createImportedPi_(piSheet, record);
      piByNo[piNoKey] = pi;
      lineCounters[pi.pi_id] = 0;
      counts.importedPis += 1;
    }

    const sourceKey = getImportSourceKey_(record);
    const itemNaturalKey = getItemNaturalKey_({
      pi_no: record.pi_no,
      line_no: record.line_no,
      fabric_name: record.fabric_name,
      colour: record.colour,
      ordered_qty: record.ordered_qty,
      gsm: record.gsm,
      width: record.width,
    });

    if (sourceKeys[sourceKey] || naturalKeys[itemNaturalKey]) {
      writeImportResult_(importSheet, headers, rowNumber, {
        status: 'Skipped',
        piId: pi.pi_id,
        itemId: record.imported_item_id || '',
        message: 'Already exists in PMS.',
      });
      counts.skippedRows += 1;
      continue;
    }

    const lineNo = record.line_no || String((lineCounters[pi.pi_id] || 0) + 1);
    lineCounters[pi.pi_id] = Math.max(lineCounters[pi.pi_id] || 0, toNumber_(lineNo));

    const item = createImportedPiItem_(itemSheet, pi, record, sourceKey, lineNo);
    sourceKeys[sourceKey] = true;
    naturalKeys[itemNaturalKey] = true;
    touchedPiIds[pi.pi_id] = true;

    ensureImportedMasters_(spreadsheet, record);
    writeImportResult_(importSheet, headers, rowNumber, {
      status: 'Imported',
      piId: pi.pi_id,
      itemId: item.pi_item_id,
      message: 'Imported successfully.',
    });

    counts.importedItems += 1;
  }

  Object.keys(touchedPiIds).forEach(function (piId) {
    recalculatePi_(piId);
  });

  return counts;
}

function createImportedPi_(piSheet, record) {
  const now = new Date().toISOString();
  const pi = {
    pi_id: makeId_('PI'),
    pi_no: record.pi_no,
    customer_id: '',
    customer_name: record.customer_name,
    sales_manager: record.sales_manager || '',
    pi_date: record.pi_date || today_(),
    delivery_date: record.delivery_date || '',
    priority: record.priority || 'Normal',
    remarks: record.remarks || '',
    status: 'New',
    created_at: now,
    updated_at: now,
  };

  appendObject_(piSheet, pi);
  return pi;
}

function createImportedPiItem_(itemSheet, pi, record, sourceKey, lineNo) {
  const orderedQty = toNumber_(record.ordered_qty);
  const item = {
    pi_item_id: makeId_('ITEM'),
    source_key: sourceKey,
    pi_id: pi.pi_id,
    pi_no: pi.pi_no,
    line_no: lineNo,
    fabric_name: record.fabric_name,
    colour: record.colour,
    ordered_qty: orderedQty,
    unit: record.unit || 'Kg',
    gsm: record.gsm || '',
    width: record.width || '',
    planned_qty: 0,
    greige_produced_qty: 0,
    dyeing_sent_qty: 0,
    dyeing_received_qty: 0,
    production_balance: orderedQty,
    dyeing_balance: 0,
    final_balance: orderedQty,
    status: 'New',
    remarks: record.remarks || '',
  };

  appendObject_(itemSheet, item);
  return item;
}

function validateImportRecord_(record) {
  if (!record.pi_no) {
    return 'PI number is required.';
  }

  if (!record.customer_name) {
    return 'Customer name is required.';
  }

  if (!record.fabric_name) {
    return 'Fabric name is required.';
  }

  if (!record.colour) {
    return 'Colour is required.';
  }

  if (toNumber_(record.ordered_qty) <= 0) {
    return 'Ordered quantity must be more than 0.';
  }

  return '';
}

function isBlankImportRecord_(record) {
  return [
    'source_key',
    'pi_no',
    'customer_name',
    'fabric_name',
    'colour',
    'ordered_qty',
  ].every(function (field) {
    return String(record[field] || '').trim() === '';
  });
}

function getImportSourceKey_(record) {
  if (record.source_key) {
    return String(record.source_key).trim();
  }

  if (record.line_no) {
    return 'PI:' + normalizeKey_(record.pi_no) + ':LINE:' + normalizeKey_(record.line_no);
  }

  return getItemNaturalKey_(record);
}

function getItemNaturalKey_(record) {
  return [
    normalizeKey_(record.pi_no),
    normalizeKey_(record.line_no),
    normalizeKey_(record.fabric_name),
    normalizeKey_(record.colour),
    normalizeKey_(record.ordered_qty),
    normalizeKey_(record.gsm),
    normalizeKey_(record.width),
  ].join('|');
}

function writeImportResult_(sheet, headers, rowNumber, result) {
  const now = result.status === 'Imported' ? new Date().toISOString() : '';
  setImportCell_(sheet, headers, rowNumber, 'import_status', result.status || '');
  setImportCell_(sheet, headers, rowNumber, 'imported_pi_id', result.piId || '');
  setImportCell_(sheet, headers, rowNumber, 'imported_item_id', result.itemId || '');
  setImportCell_(sheet, headers, rowNumber, 'imported_at', now);
  setImportCell_(sheet, headers, rowNumber, 'import_message', result.message || '');
}

function setImportCell_(sheet, headers, rowNumber, columnName, value) {
  const columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    return;
  }

  sheet.getRange(rowNumber, columnIndex + 1).setValue(value);
}

function ensureImportedMasters_(spreadsheet, record) {
  ensureMasterByName_(
    spreadsheet.getSheetByName('Masters_Customers'),
    'customer_id',
    'customer_name',
    'CUST',
    record.customer_name,
    {}
  );

  ensureMasterByName_(
    spreadsheet.getSheetByName('Masters_Fabrics'),
    'fabric_id',
    'fabric_name',
    'FAB',
    record.fabric_name,
    {
      default_gsm: record.gsm || '',
      default_width: record.width || '',
      default_unit: record.unit || 'Kg',
    }
  );
}

function ensureMasterByName_(sheet, idColumn, nameColumn, idPrefix, name, extraFields) {
  if (!name) {
    return;
  }

  const exists = getSheetObjects_(sheet).some(function (record) {
    return normalizeKey_(record[nameColumn]) === normalizeKey_(name);
  });

  if (exists) {
    return;
  }

  const record = extraFields || {};
  record[idColumn] = makeId_(idPrefix);
  record[nameColumn] = name;
  record.status = 'Active';
  record.remarks = '';
  appendObject_(sheet, record);
}

function objectFromValues_(headers, values) {
  const record = {};

  headers.forEach(function (header, index) {
    if (header) {
      record[header] = normalizeCellValue_(values[index]);
    }
  });

  return record;
}

function normalizeKey_(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim()
    .toUpperCase();
}

function importGreigeLots_() {
  setupPmsSheetForApi_();

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = spreadsheet.getSheetByName('Greige_Lot_Import');
  const greigeSheet = spreadsheet.getSheetByName('Greige_Lots');
  const headers = getHeaders_(importSheet);
  const values = importSheet.getDataRange().getValues();
  const requiredColumns = ['pi_no', 'fabric_name', 'weight_qty'];

  requiredColumns.forEach(function (columnName) {
    if (headers.indexOf(columnName) === -1) {
      throw new Error('Greige_Lot_Import is missing column: ' + columnName);
    }
  });

  const counts = {
    ok: true,
    importedLots: 0,
    skippedRows: 0,
    failedRows: 0,
  };

  if (values.length < 2) {
    return counts;
  }

  const existingKeys = {};
  const existingLotNos = {};
  getSheetObjects_(greigeSheet).forEach(function (lot) {
    if (lot.source_key) {
      existingKeys[normalizeKey_(lot.source_key)] = true;
    }
    if (lot.greige_lot_no) {
      existingLotNos[normalizeKey_(lot.greige_lot_no)] = true;
    }
  });

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    const record = objectFromValues_(headers, values[rowIndex]);

    if (isBlankGreigeImportRecord_(record)) {
      continue;
    }

    if (record.import_status === 'Imported' && record.imported_greige_lot_id) {
      counts.skippedRows += 1;
      continue;
    }

    const validationMessage = validateGreigeImportRecord_(record);
    if (validationMessage) {
      writeLotImportResult_(importSheet, headers, rowNumber, {
        status: 'Failed',
        message: validationMessage,
      }, 'imported_greige_lot_id');
      counts.failedRows += 1;
      continue;
    }

    const sourceKey = record.source_key || getGreigeImportNaturalKey_(record);
    const lotNo = record.greige_lot_no || makeLotNo_('GL');

    if (existingKeys[normalizeKey_(sourceKey)] || existingLotNos[normalizeKey_(lotNo)]) {
      writeLotImportResult_(importSheet, headers, rowNumber, {
        status: 'Skipped',
        message: 'Already exists in PMS.',
      }, 'imported_greige_lot_id');
      counts.skippedRows += 1;
      continue;
    }

    const group = findFabricGroupForGreigeImport_(record);
    if (!group) {
      writeLotImportResult_(importSheet, headers, rowNumber, {
        status: 'Failed',
        message: 'No matching PI fabric group found.',
      }, 'imported_greige_lot_id');
      counts.failedRows += 1;
      continue;
    }

    const greigeLot = {
      greige_lot_id: makeId_('GREIGE'),
      source_key: sourceKey,
      greige_lot_no: lotNo,
      pi_id: group.pi_id,
      pi_no: group.pi_no,
      fabric_name: group.fabric_name,
      gsm: group.gsm || '',
      width: group.width || '',
      received_date: record.received_date || today_(),
      source_type: record.source_type || 'In-house',
      machine_no: record.machine_no || '',
      job_worker_id: '',
      job_worker_name: record.job_worker_name || '',
      rolls: toNumber_(record.rolls),
      weight_qty: toNumber_(record.weight_qty),
      unit: record.unit || group.unit || 'Kg',
      dyeing_sent_rolls: 0,
      dyeing_sent_weight: 0,
      balance_rolls: toNumber_(record.rolls),
      balance_weight: toNumber_(record.weight_qty),
      status: 'Received',
      remarks: record.remarks || '',
      created_at: new Date().toISOString(),
    };

    appendObject_(greigeSheet, greigeLot);
    existingKeys[normalizeKey_(sourceKey)] = true;
    existingLotNos[normalizeKey_(lotNo)] = true;
    recalculateFabricGroup_(group.pi_id, group.fabric_name, group.gsm, group.width);

    writeLotImportResult_(importSheet, headers, rowNumber, {
      status: 'Imported',
      id: greigeLot.greige_lot_id,
      message: 'Greige lot imported successfully.',
    }, 'imported_greige_lot_id');

    counts.importedLots += 1;
  }

  return counts;
}

function importDyeingLots_() {
  setupPmsSheetForApi_();

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = spreadsheet.getSheetByName('Dyeing_Lot_Import');
  const dyeingSheet = spreadsheet.getSheetByName('Dyeing_Lots');
  const headers = getHeaders_(importSheet);
  const values = importSheet.getDataRange().getValues();
  const requiredColumns = ['greige_lot_no', 'colour'];

  requiredColumns.forEach(function (columnName) {
    if (headers.indexOf(columnName) === -1) {
      throw new Error('Dyeing_Lot_Import is missing column: ' + columnName);
    }
  });

  const counts = {
    ok: true,
    importedLots: 0,
    skippedRows: 0,
    failedRows: 0,
  };

  if (values.length < 2) {
    return counts;
  }

  const existingKeys = {};
  getSheetObjects_(dyeingSheet).forEach(function (lot) {
    if (lot.source_key) {
      existingKeys[normalizeKey_(lot.source_key)] = true;
    }
  });

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    const record = objectFromValues_(headers, values[rowIndex]);

    if (isBlankDyeingImportRecord_(record)) {
      continue;
    }

    if (record.import_status === 'Imported' && record.imported_dyeing_lot_id) {
      counts.skippedRows += 1;
      continue;
    }

    const validationMessage = validateDyeingImportRecord_(record);
    if (validationMessage) {
      writeLotImportResult_(importSheet, headers, rowNumber, {
        status: 'Failed',
        message: validationMessage,
      }, 'imported_dyeing_lot_id');
      counts.failedRows += 1;
      continue;
    }

    const sourceKey = record.source_key || getDyeingImportNaturalKey_(record);
    if (existingKeys[normalizeKey_(sourceKey)]) {
      writeLotImportResult_(importSheet, headers, rowNumber, {
        status: 'Skipped',
        message: 'Already exists in PMS.',
      }, 'imported_dyeing_lot_id');
      counts.skippedRows += 1;
      continue;
    }

    const greigeLot = getGreigeLotByNo_(record.greige_lot_no);
    if (!greigeLot) {
      writeLotImportResult_(importSheet, headers, rowNumber, {
        status: 'Failed',
        message: 'No matching greige lot number found.',
      }, 'imported_dyeing_lot_id');
      counts.failedRows += 1;
      continue;
    }

    const item = findDyeingItemForGreigeLot_(greigeLot, record);
    if (!item) {
      writeLotImportResult_(importSheet, headers, rowNumber, {
        status: 'Failed',
        message: 'No matching colour item found for this greige lot.',
      }, 'imported_dyeing_lot_id');
      counts.failedRows += 1;
      continue;
    }

    const sentWeight = toNumber_(record.sent_weight);
    const receivedWeight = toNumber_(record.received_weight);
    const dyeingLot = {
      dyeing_lot_id: makeId_('DYE'),
      source_key: sourceKey,
      greige_lot_id: greigeLot.greige_lot_id,
      greige_lot_no: greigeLot.greige_lot_no,
      pi_item_id: item.pi_item_id,
      pi_no: greigeLot.pi_no,
      fabric_name: greigeLot.fabric_name,
      dyeing_party: record.dyeing_party || '',
      sent_date: record.sent_date || today_(),
      sent_rolls: toNumber_(record.sent_rolls),
      sent_weight: sentWeight,
      colour: record.colour,
      process_type: record.process_type || '',
      addons: record.addons || '',
      received_date: record.received_date || '',
      received_rolls: toNumber_(record.received_rolls),
      received_weight: receivedWeight,
      loss_weight: Math.max(sentWeight - receivedWeight, 0),
      status: getDyeingStatus_(sentWeight, receivedWeight),
      remarks: record.remarks || '',
      created_at: new Date().toISOString(),
    };

    appendObject_(dyeingSheet, dyeingLot);
    existingKeys[normalizeKey_(sourceKey)] = true;
    recalculateGreigeLot_(greigeLot.greige_lot_id);
    recalculateItem_(item.pi_item_id);

    writeLotImportResult_(importSheet, headers, rowNumber, {
      status: 'Imported',
      id: dyeingLot.dyeing_lot_id,
      message: 'Dyeing lot imported successfully.',
    }, 'imported_dyeing_lot_id');

    counts.importedLots += 1;
  }

  return counts;
}

function writeLotImportResult_(sheet, headers, rowNumber, result, idColumn) {
  setImportCell_(sheet, headers, rowNumber, 'import_status', result.status || '');
  setImportCell_(sheet, headers, rowNumber, idColumn, result.id || '');
  setImportCell_(sheet, headers, rowNumber, 'imported_at', result.status === 'Imported' ? new Date().toISOString() : '');
  setImportCell_(sheet, headers, rowNumber, 'import_message', result.message || '');
}

function validateGreigeImportRecord_(record) {
  if (!record.pi_no) {
    return 'PI number is required.';
  }
  if (!record.fabric_name) {
    return 'Fabric name is required.';
  }
  if (toNumber_(record.weight_qty) <= 0) {
    return 'Weight must be more than 0.';
  }
  return '';
}

function validateDyeingImportRecord_(record) {
  if (!record.greige_lot_no) {
    return 'Greige lot number is required.';
  }
  if (!record.colour) {
    return 'Dyeing colour is required.';
  }
  if (toNumber_(record.sent_weight) <= 0 && toNumber_(record.received_weight) <= 0) {
    return 'Sent or received weight is required.';
  }
  return '';
}

function isBlankGreigeImportRecord_(record) {
  return ['pi_no', 'fabric_name', 'weight_qty', 'greige_lot_no'].every(function (field) {
    return String(record[field] || '').trim() === '';
  });
}

function isBlankDyeingImportRecord_(record) {
  return ['greige_lot_no', 'colour', 'sent_weight', 'received_weight'].every(function (field) {
    return String(record[field] || '').trim() === '';
  });
}

function findPiItemForImport_(record) {
  const matches = getSheetObjects_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PI_Items'))
    .filter(function (item) {
      if (normalizeKey_(item.pi_no) !== normalizeKey_(record.pi_no)) {
        return false;
      }
      if (record.line_no && normalizeKey_(item.line_no) !== normalizeKey_(record.line_no)) {
        return false;
      }
      if (record.fabric_name && normalizeKey_(item.fabric_name) !== normalizeKey_(record.fabric_name)) {
        return false;
      }
      if (record.colour && normalizeKey_(item.colour) !== normalizeKey_(record.colour)) {
        return false;
      }
      return true;
    });

  return matches.length === 1 ? matches[0] : null;
}

function findFabricGroupForGreigeImport_(record) {
  const matches = getSheetObjects_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PI_Items'))
    .filter(function (item) {
      if (normalizeKey_(item.pi_no) !== normalizeKey_(record.pi_no)) {
        return false;
      }
      if (normalizeKey_(item.fabric_name) !== normalizeKey_(record.fabric_name)) {
        return false;
      }
      if (record.gsm && normalizeKey_(item.gsm) !== normalizeKey_(record.gsm)) {
        return false;
      }
      if (record.width && normalizeKey_(item.width) !== normalizeKey_(record.width)) {
        return false;
      }
      return true;
    });

  if (matches.length === 0) {
    return null;
  }

  const uniqueGroups = {};
  matches.forEach(function (item) {
    uniqueGroups[getFabricGroupKey_(item)] = item;
  });

  if (Object.keys(uniqueGroups).length > 1) {
    return null;
  }

  const first = matches[0];
  return {
    pi_id: first.pi_id,
    pi_no: first.pi_no,
    fabric_name: first.fabric_name,
    gsm: record.gsm || first.gsm || '',
    width: record.width || first.width || '',
    unit: first.unit || 'Kg',
  };
}

function getFabricGroupKey_(record) {
  return [
    normalizeKey_(record.pi_id || record.pi_no),
    normalizeKey_(record.fabric_name),
    normalizeKey_(record.gsm),
    normalizeKey_(record.width),
  ].join('|');
}

function findDyeingItemForGreigeLot_(greigeLot, record) {
  const matches = getSheetObjects_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PI_Items'))
    .filter(function (item) {
      if (greigeLot.pi_id && String(item.pi_id) !== String(greigeLot.pi_id)) {
        return false;
      }
      if (!greigeLot.pi_id && normalizeKey_(item.pi_no) !== normalizeKey_(greigeLot.pi_no)) {
        return false;
      }
      if (normalizeKey_(item.fabric_name) !== normalizeKey_(greigeLot.fabric_name)) {
        return false;
      }
      if (record.line_no && normalizeKey_(item.line_no) !== normalizeKey_(record.line_no)) {
        return false;
      }
      if (record.colour && normalizeKey_(item.colour) !== normalizeKey_(record.colour)) {
        return false;
      }
      return true;
    });

  return matches.length === 1 ? matches[0] : null;
}

function getGreigeLotByNo_(greigeLotNo) {
  const key = normalizeKey_(greigeLotNo);
  return getSheetObjects_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Greige_Lots'))
    .find(function (lot) {
      return normalizeKey_(lot.greige_lot_no) === key;
    }) || null;
}

function getPiItemById_(piItemId) {
  const item = getSheetObjects_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PI_Items'))
    .find(function (record) {
      return String(record.pi_item_id) === String(piItemId);
    });

  if (!item) {
    throw new Error('PI item not found.');
  }

  return item;
}

function getGreigeImportNaturalKey_(record) {
  return [
    'GREIGE',
    normalizeKey_(record.pi_no),
    normalizeKey_(record.fabric_name),
    normalizeKey_(record.gsm),
    normalizeKey_(record.width),
    normalizeKey_(record.received_date),
    normalizeKey_(record.machine_no),
    normalizeKey_(record.job_worker_name),
    normalizeKey_(record.rolls),
    normalizeKey_(record.weight_qty),
  ].join('|');
}

function getDyeingImportNaturalKey_(record) {
  return [
    'DYE',
    normalizeKey_(record.greige_lot_no),
    normalizeKey_(record.colour),
    normalizeKey_(record.dyeing_party),
    normalizeKey_(record.sent_date),
    normalizeKey_(record.sent_rolls),
    normalizeKey_(record.sent_weight),
    normalizeKey_(record.received_date),
    normalizeKey_(record.received_rolls),
    normalizeKey_(record.received_weight),
  ].join('|');
}

function makeLotNo_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 1000);
}

function setPmsApiToken() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Set PMS API Token',
    'Enter a private token. You will add the same value in Cloudflare as PMS_API_TOKEN.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const token = response.getResponseText().trim();
  if (!token) {
    ui.alert('Token was empty. Nothing changed.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty(PMS_API_TOKEN_PROPERTY, token);
  ui.alert('PMS API token saved.');
}

function showPmsWebAppHelp() {
  SpreadsheetApp.getUi().alert(
    'Deploy this Apps Script as a Web App.\n\n' +
    'Execute as: Me\n' +
    'Who has access: Anyone\n\n' +
    'Copy the /exec URL and add it in Cloudflare as APPS_SCRIPT_URL.'
  );
}

function doGet() {
  return jsonResponse_({
    ok: true,
    app: 'PMS',
    message: 'PMS Apps Script API is running. Use POST requests through the Cloudflare proxy.',
  });
}

function doPost(e) {
  try {
    const request = parseRequest_(e);
    verifyToken_(request.token);
    setupPmsSheetForApi_();

    switch (request.action) {
      case 'readAll':
        return jsonResponse_(readAll_());
      case 'createPi':
        return jsonResponse_(createPi_(request.payload || {}));
      case 'saveItemYarns':
        return jsonResponse_(saveItemYarns_(request.payload || {}));
      case 'saveGroupYarns':
        return jsonResponse_(saveGroupYarns_(request.payload || {}));
      case 'addProductionLot':
      case 'addGreigeLot':
        return jsonResponse_(addGreigeLot_(request.payload || {}));
      case 'addDyeingLot':
        return jsonResponse_(addDyeingLot_(request.payload || {}));
      case 'addDyeingLotsBatch':
        return jsonResponse_(addDyeingLotsBatch_(request.payload || {}));
      case 'upsertMaster':
        return jsonResponse_(upsertMaster_(request.payload || {}));
      case 'importSalesPis':
        return jsonResponse_(importSalesPis_());
      case 'importGreigeLots':
        return jsonResponse_(importGreigeLots_());
      case 'importDyeingLots':
        return jsonResponse_(importDyeingLots_());
      default:
        throw new Error('Unknown action: ' + request.action);
    }
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message,
    });
  }
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing POST body.');
  }

  return JSON.parse(e.postData.contents);
}

function verifyToken_(token) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty(PMS_API_TOKEN_PROPERTY);

  if (!expectedToken) {
    throw new Error('PMS API token is not set. Use PMS > Set API Token in the spreadsheet.');
  }

  if (!token || token !== expectedToken) {
    throw new Error('Invalid PMS API token.');
  }
}

function setupPmsSheetForApi_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  PMS_SHEETS.forEach(function (sheetConfig) {
    const sheet = getOrCreateSheet_(spreadsheet, sheetConfig.name);
    ensureHeaders_(sheet, sheetConfig.headers);
    formatHeader_(sheet, sheetConfig.headers.length);
  });
}

function readAll_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const data = {};

  PMS_SHEETS.forEach(function (sheetConfig) {
    data[sheetConfig.name] = getSheetObjects_(spreadsheet.getSheetByName(sheetConfig.name));
  });

  return {
    ok: true,
    data: data,
    serverTime: new Date().toISOString(),
  };
}

function createPi_(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date().toISOString();
  const pi = payload.pi || {};
  const items = payload.items || [];

  if (!pi.pi_no) {
    throw new Error('PI number is required.');
  }

  if (!pi.customer_name) {
    throw new Error('Customer name is required.');
  }

  if (items.length === 0) {
    throw new Error('At least one PI item is required.');
  }

  const piId = pi.pi_id || makeId_('PI');
  const piRecord = {
    pi_id: piId,
    pi_no: pi.pi_no,
    customer_id: pi.customer_id || '',
    customer_name: pi.customer_name,
    sales_manager: pi.sales_manager || '',
    pi_date: pi.pi_date || today_(),
    delivery_date: pi.delivery_date || '',
    priority: pi.priority || 'Normal',
    remarks: pi.remarks || '',
    status: 'New',
    created_at: now,
    updated_at: now,
  };

  appendObject_(spreadsheet.getSheetByName('PIs'), piRecord);

  items.forEach(function (item, index) {
    const orderedQty = toNumber_(item.ordered_qty);
    const piItemId = item.pi_item_id || makeId_('ITEM');
    const itemRecord = {
      pi_item_id: piItemId,
      pi_id: piId,
      pi_no: pi.pi_no,
      line_no: index + 1,
      fabric_name: item.fabric_name || '',
      colour: item.colour || '',
      ordered_qty: orderedQty,
      unit: item.unit || 'Kg',
      gsm: item.gsm || '',
      width: item.width || '',
      planned_qty: toNumber_(item.planned_qty),
      greige_produced_qty: 0,
      dyeing_sent_qty: 0,
      dyeing_received_qty: 0,
      production_balance: orderedQty,
      dyeing_balance: 0,
      final_balance: orderedQty,
      status: 'New',
      remarks: item.remarks || '',
    };

    appendObject_(spreadsheet.getSheetByName('PI_Items'), itemRecord);
  });

  return readAll_();
}

function saveItemYarns_(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const piItemId = payload.pi_item_id;
  const yarns = payload.yarns || [];

  if (!piItemId) {
    throw new Error('PI item is required.');
  }

  if (yarns.length > 3) {
    throw new Error('Only 1 to 3 yarn blends are supported.');
  }

  deleteRowsWhere_(spreadsheet.getSheetByName('Item_Yarns'), 'pi_item_id', piItemId);

  yarns.forEach(function (yarn, index) {
    const requiredQty = toNumber_(yarn.required_qty);
    const stockAvailableQty = toNumber_(yarn.stock_available_qty);
    const shortageQty = Math.max(requiredQty - stockAvailableQty, 0);

    appendObject_(spreadsheet.getSheetByName('Item_Yarns'), {
      item_yarn_id: yarn.item_yarn_id || makeId_('YARN'),
      pi_item_id: piItemId,
      yarn_no: index + 1,
      yarn_name: yarn.yarn_name || '',
      blend_percent: yarn.blend_percent || '',
      required_qty: requiredQty,
      stock_available_qty: stockAvailableQty,
      shortage_qty: shortageQty,
      status: shortageQty > 0 ? 'Shortage' : 'Available',
      remarks: yarn.remarks || '',
    });
  });

  recalculateItem_(piItemId);
  return readAll_();
}

function saveGroupYarns_(payload) {
  var piItemIds = payload.pi_item_ids || [];
  var yarns = payload.yarns || [];

  if (piItemIds.length === 0) {
    throw new Error('At least one PI item is required.');
  }

  if (yarns.length > 3) {
    throw new Error('Only 1 to 3 yarn blends are supported.');
  }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var yarnSheet = spreadsheet.getSheetByName('Item_Yarns');

  piItemIds.forEach(function (piItemId) {
    deleteRowsWhere_(yarnSheet, 'pi_item_id', piItemId);

    yarns.forEach(function (yarn, index) {
      var requiredQty = toNumber_(yarn.required_qty);
      var stockAvailableQty = toNumber_(yarn.stock_available_qty);
      var shortageQty = Math.max(requiredQty - stockAvailableQty, 0);

      appendObject_(yarnSheet, {
        item_yarn_id: makeId_('YARN'),
        pi_item_id: piItemId,
        yarn_no: index + 1,
        yarn_name: yarn.yarn_name || '',
        blend_percent: yarn.blend_percent || '',
        required_qty: requiredQty,
        stock_available_qty: stockAvailableQty,
        shortage_qty: shortageQty,
        status: shortageQty > 0 ? 'Shortage' : 'Available',
        remarks: yarn.remarks || '',
      });
    });

    recalculateItem_(piItemId);
  });

  return readAll_();
}

function addGreigeLot_(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const piItemId = payload.pi_item_id;

  if (!piItemId) {
    throw new Error('PI item is required.');
  }

  const item = getPiItemById_(piItemId);
  const weightQty = toNumber_(payload.weight_qty || payload.produced_qty);
  const rolls = toNumber_(payload.rolls);
  const greigeLotNo = payload.greige_lot_no || makeLotNo_('GL');

  if (weightQty <= 0) {
    throw new Error('Greige lot weight must be more than 0.');
  }

  appendObject_(spreadsheet.getSheetByName('Greige_Lots'), {
    greige_lot_id: payload.greige_lot_id || makeId_('GREIGE'),
    source_key: payload.source_key || '',
    greige_lot_no: greigeLotNo,
    pi_id: item.pi_id || '',
    pi_no: item.pi_no || '',
    fabric_name: item.fabric_name || '',
    gsm: item.gsm || '',
    width: item.width || '',
    received_date: payload.received_date || payload.production_date || today_(),
    source_type: payload.source_type || payload.production_type || 'In-house',
    machine_no: payload.machine_no || '',
    job_worker_id: payload.job_worker_id || '',
    job_worker_name: payload.job_worker_name || '',
    rolls: rolls,
    weight_qty: weightQty,
    unit: payload.unit || item.unit || 'Kg',
    dyeing_sent_rolls: 0,
    dyeing_sent_weight: 0,
    balance_rolls: rolls,
    balance_weight: weightQty,
    status: payload.status || 'Received',
    remarks: payload.remarks || '',
    created_at: new Date().toISOString(),
  });

  recalculateFabricGroup_(item.pi_id, item.fabric_name, item.gsm, item.width);
  return readAll_();
}

function addDyeingLot_(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const greigeLotNo = payload.greige_lot_no || '';
  const greigeLot = greigeLotNo ? getGreigeLotByNo_(greigeLotNo) : null;
  const piItemId = payload.pi_item_id || '';

  if (!piItemId) {
    throw new Error('PI item is required.');
  }

  const item = getPiItemById_(piItemId);
  if (greigeLot && !isSameFabricGroup_(item, greigeLot)) {
    throw new Error('Selected greige lot does not belong to this fabric group.');
  }

  const sentWeight = toNumber_(payload.sent_weight || payload.sent_qty);
  const receivedWeight = toNumber_(payload.received_weight || payload.received_qty);
  const sentRolls = toNumber_(payload.sent_rolls);
  const receivedRolls = toNumber_(payload.received_rolls);
  const lossWeight = payload.loss_weight === '' || payload.loss_weight === undefined
    ? Math.max(sentWeight - receivedWeight, 0)
    : toNumber_(payload.loss_weight);

  appendObject_(spreadsheet.getSheetByName('Dyeing_Lots'), {
    dyeing_lot_id: payload.dyeing_lot_id || makeId_('DYE'),
    dyeing_lot_no: payload.dyeing_lot_no || makeLotNo_('DL'),
    source_key: payload.source_key || '',
    greige_lot_id: greigeLot ? greigeLot.greige_lot_id : (payload.greige_lot_id || ''),
    greige_lot_no: greigeLot ? greigeLot.greige_lot_no : greigeLotNo,
    pi_item_id: piItemId,
    pi_no: item.pi_no || '',
    fabric_name: item.fabric_name || '',
    dyeing_party: payload.dyeing_party || '',
    sent_date: payload.sent_date || today_(),
    sent_rolls: sentRolls,
    sent_weight: sentWeight,
    colour: payload.colour || item.colour || '',
    process_type: payload.process_type || '',
    addons: Array.isArray(payload.addons) ? payload.addons.join(', ') : (payload.addons || ''),
    received_date: payload.received_date || '',
    received_rolls: receivedRolls,
    received_weight: receivedWeight,
    loss_weight: lossWeight,
    status: payload.status || getDyeingStatus_(sentWeight, receivedWeight),
    remarks: payload.remarks || '',
    created_at: new Date().toISOString(),
  });

  if (greigeLot) {
    recalculateGreigeLot_(greigeLot.greige_lot_id);
  }
  recalculateItem_(piItemId);
  return readAll_();
}

function addDyeingLotsBatch_(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const dyeingLotsSheet = spreadsheet.getSheetByName('Dyeing_Lots');
  const itemsToUpdate = [];
  const greigeLotsToUpdate = [];

  const lots = payload.lots || [];
  
  lots.forEach(function (lotPayload) {
    const greigeLotNo = lotPayload.greige_lot_no || '';
    const greigeLot = greigeLotNo ? getGreigeLotByNo_(greigeLotNo) : null;
    const piItemId = lotPayload.pi_item_id || '';

    if (!piItemId) {
      throw new Error('PI item is required.');
    }

    const item = getPiItemById_(piItemId);
    if (greigeLot && !isSameFabricGroup_(item, greigeLot)) {
      throw new Error('Selected greige lot does not belong to the fabric group for item: ' + item.fabric_name);
    }

    const sentWeight = toNumber_(lotPayload.sent_weight || lotPayload.sent_qty);
    const receivedWeight = toNumber_(lotPayload.received_weight || lotPayload.received_qty);
    const sentRolls = toNumber_(lotPayload.sent_rolls);
    const receivedRolls = toNumber_(lotPayload.received_rolls);
    
    // Automatic Lot Allocation
    let remainingToAllocate = sentWeight;
    let availableLots = getGreigeLotsForFabricGroup_(item).filter(function(l) { 
      return toNumber_(l.balance_weight) > 0; 
    });
    // Sort by date (FIFO)
    availableLots.sort(function(a, b) { return new Date(a.received_date) - new Date(b.received_date); });

    if (remainingToAllocate > 0 && availableLots.length === 0) {
      throw new Error('No Kora (Greige) available for ' + item.fabric_name);
    }

    // If no specific lot is provided, we still need to link to SOME lot in the record.
    // For simplicity, we'll link to the oldest available lot and the backend recalculate will update all balances correctly.
    // In a more robust system, we would split the Dyeing Lot record per Greige Lot, but user wants simplicity.
    const autoGreigeLot = availableLots[0];

    const lossWeight = lotPayload.loss_weight === '' || lotPayload.loss_weight === undefined
      ? Math.max(sentWeight - receivedWeight, 0)
      : toNumber_(lotPayload.loss_weight);

    appendObject_(dyeingLotsSheet, {
      dyeing_lot_id: lotPayload.dyeing_lot_id || makeId_('DYE'),
      dyeing_lot_no: lotPayload.dyeing_lot_no || makeLotNo_('DL'),
      source_key: lotPayload.source_key || '',
      greige_lot_id: autoGreigeLot ? autoGreigeLot.greige_lot_id : (lotPayload.greige_lot_id || ''),
      greige_lot_no: autoGreigeLot ? autoGreigeLot.greige_lot_no : (lotPayload.greige_lot_no || ''),
      pi_item_id: piItemId,
      pi_no: item.pi_no || '',
      fabric_name: item.fabric_name || '',
      dyeing_party: lotPayload.dyeing_party || '',
      sent_date: lotPayload.sent_date || today_(),
      sent_rolls: sentRolls,
      sent_weight: sentWeight,
      colour: lotPayload.colour || item.colour || '',
      process_type: lotPayload.process_type || '',
      addons: Array.isArray(lotPayload.addons) ? lotPayload.addons.join(', ') : (lotPayload.addons || ''),
      received_date: lotPayload.received_date || '',
      received_rolls: receivedRolls,
      received_weight: receivedWeight,
      loss_weight: lossWeight,
      status: lotPayload.status || getDyeingStatus_(sentWeight, receivedWeight),
      remarks: lotPayload.remarks || '',
      created_at: new Date().toISOString(),
    });

    // Mark all lots in this group for recalculation
    availableLots.forEach(function(l) {
      if (greigeLotsToUpdate.indexOf(l.greige_lot_id) === -1) {
        greigeLotsToUpdate.push(l.greige_lot_id);
      }
    });

    if (itemsToUpdate.indexOf(piItemId) === -1) {
      itemsToUpdate.push(piItemId);
    }
  });

  greigeLotsToUpdate.forEach(recalculateGreigeLot_);
  itemsToUpdate.forEach(recalculateItem_);
  return readAll_();
}

function upsertMaster_(payload) {
  const sheetName = payload.sheetName;
  const record = payload.record || {};
  const sheetConfig = PMS_SHEET_MAP[sheetName];

  if (!sheetConfig || sheetName.indexOf('Masters_') !== 0) {
    throw new Error('Invalid master sheet.');
  }

  const idColumn = sheetConfig.idColumn;
  if (!record[idColumn]) {
    record[idColumn] = makeId_(idColumn.replace('_id', '').toUpperCase());
  }

  upsertObject_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName), idColumn, record);
  return readAll_();
}

function recalculateFabricGroup_(piId, fabricName, gsm, width) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  getSheetObjects_(spreadsheet.getSheetByName('PI_Items'))
    .filter(function (lot) {
      return isSameFabricGroup_(lot, {
        pi_id: piId,
        fabric_name: fabricName,
        gsm: gsm,
        width: width,
      });
    })
    .forEach(function (item) {
      recalculateItem_(item.pi_item_id);
    });
}

function recalculateGreigeLot_(greigeLotId) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const greigeSheet = spreadsheet.getSheetByName('Greige_Lots');
  const rowNumber = findRowByValue_(greigeSheet, 'greige_lot_id', greigeLotId);

  const sentWeight = dyeingLots.reduce(function (total, lot) {
    return total + toNumber_(lot.sent_weight || lot.sent_qty);
  }, 0);
  const balanceRolls = Math.max(toNumber_(greigeLot.rolls) - sentRolls, 0);
  const balanceWeight = Math.max(toNumber_(greigeLot.weight_qty) - sentWeight, 0);
  let status = 'Received';

  if (sentWeight > 0 && balanceWeight > 0) {
    status = 'Part Sent';
  } else if (sentWeight > 0 && balanceWeight <= 0) {
    status = 'Fully Sent';
  }

  updateObjectAtRow_(greigeSheet, rowNumber, {
    dyeing_sent_rolls: sentRolls,
    dyeing_sent_weight: sentWeight,
    balance_rolls: balanceRolls,
    balance_weight: balanceWeight,
    status: status,
  });
}

function recalculateItem_(piItemId) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const itemSheet = spreadsheet.getSheetByName('PI_Items');
  const dyeingLots = getSheetObjects_(spreadsheet.getSheetByName('Dyeing_Lots'))
    .filter(function (lot) {
      return String(lot.pi_item_id) === String(piItemId);
    });

  const itemRow = findRowByValue_(itemSheet, 'pi_item_id', piItemId);
  if (!itemRow) {
    throw new Error('PI item not found.');
  }

  const item = getObjectFromRow_(itemSheet, itemRow);
  const orderedQty = toNumber_(item.ordered_qty);
  const plannedQty = toNumber_(item.planned_qty);
  const fabricGroup = getFabricGroupProgress_(item);
  const producedQty = fabricGroup.itemGreigeQty;
  const dyeingSentQty = dyeingLots.reduce(function (total, lot) {
    return total + toNumber_(lot.sent_weight || lot.sent_qty);
  }, 0);
  const dyeingReceivedQty = dyeingLots.reduce(function (total, lot) {
    return total + toNumber_(lot.received_weight || lot.received_qty);
  }, 0);

  const nextStatus = getItemStatus_(orderedQty, plannedQty, producedQty, dyeingSentQty, dyeingReceivedQty);

  updateObjectAtRow_(itemSheet, itemRow, {
    planned_qty: plannedQty,
    greige_produced_qty: producedQty,
    dyeing_sent_qty: dyeingSentQty,
    dyeing_received_qty: dyeingReceivedQty,
    production_balance: Math.max(orderedQty - producedQty, 0),
    dyeing_balance: Math.max(dyeingSentQty - dyeingReceivedQty, 0),
    final_balance: Math.max(orderedQty - dyeingReceivedQty, 0),
    status: nextStatus,
  });

  recalculatePi_(item.pi_id);
}

function getFabricGroupProgress_(item) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const groupItems = getSheetObjects_(spreadsheet.getSheetByName('PI_Items'))
    .filter(function (candidate) {
      return isSameFabricGroup_(candidate, item);
    });
  const groupOrderedQty = groupItems.reduce(function (total, groupItem) {
    return total + toNumber_(groupItem.ordered_qty);
  }, 0);
  const greigeQty = getSheetObjects_(spreadsheet.getSheetByName('Greige_Lots'))
    .filter(function (lot) {
      return isSameFabricGroup_(lot, item);
    })
    .reduce(function (total, lot) {
      return total + toNumber_(lot.weight_qty);
    }, 0);
  const ratio = groupOrderedQty > 0 ? Math.min(greigeQty / groupOrderedQty, 1) : 0;

  return {
    groupOrderedQty: groupOrderedQty,
    groupGreigeQty: greigeQty,
    itemGreigeQty: Math.min(toNumber_(item.ordered_qty), toNumber_(item.ordered_qty) * ratio),
  };
}

function isSameFabricGroup_(record, group) {
  if (group.pi_id && record.pi_id && String(record.pi_id) !== String(group.pi_id)) {
    return false;
  }

  if ((!group.pi_id || !record.pi_id) && normalizeKey_(record.pi_no) !== normalizeKey_(group.pi_no)) {
    return false;
  }

  if (normalizeKey_(record.fabric_name) !== normalizeKey_(group.fabric_name)) {
    return false;
  }

  if (group.gsm && record.gsm && normalizeKey_(record.gsm) !== normalizeKey_(group.gsm)) {
    return false;
  }

  if (group.width && record.width && normalizeKey_(record.width) !== normalizeKey_(group.width)) {
    return false;
  }

  return true;
}

function recalculatePi_(piId) {
  if (!piId) {
    return;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const piSheet = spreadsheet.getSheetByName('PIs');
  const piRow = findRowByValue_(piSheet, 'pi_id', piId);

  if (!piRow) {
    return;
  }

  const items = getSheetObjects_(spreadsheet.getSheetByName('PI_Items'))
    .filter(function (item) {
      return String(item.pi_id) === String(piId);
    });

  let status = 'New';
  if (items.length > 0 && items.every(function (item) { return item.status === 'Completed'; })) {
    status = 'Completed';
  } else if (items.some(function (item) { return item.status !== 'New'; })) {
    status = 'Running';
  }

  updateObjectAtRow_(piSheet, piRow, {
    status: status,
    updated_at: new Date().toISOString(),
  });
}

function getItemStatus_(orderedQty, plannedQty, producedQty, dyeingSentQty, dyeingReceivedQty) {
  if (orderedQty > 0 && dyeingReceivedQty >= orderedQty) {
    return 'Completed';
  }

  if (dyeingReceivedQty > 0) {
    return 'Part Received';
  }

  if (dyeingSentQty > 0) {
    return 'In Dyeing';
  }

  if (producedQty >= orderedQty && orderedQty > 0) {
    return 'Greige Ready';
  }

  if (producedQty > 0) {
    return 'Greige Received';
  }

  if (plannedQty > 0) {
    return 'Planned';
  }

  return 'New';
}

function getDyeingStatus_(sentQty, receivedQty) {
  if (receivedQty <= 0) {
    return 'Sent';
  }

  if (receivedQty < sentQty) {
    return 'Part Received';
  }

  return 'Received';
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasAnyHeader = currentHeaders.some(function (value) {
    return String(value).trim() !== '';
  });

  if (!hasAnyHeader) {
    headerRange.setValues([headers]);
    return;
  }

  const existingHeaderMap = {};
  currentHeaders.forEach(function (header) {
    const key = String(header).trim();
    if (key) {
      existingHeaderMap[key] = true;
    }
  });

  const missingHeaders = headers.filter(function (header) {
    return !existingHeaderMap[header];
  });

  if (missingHeaders.length === 0) {
    return;
  }

  sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
}

function formatHeader_(sheet, columnCount) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columnCount)
    .setFontWeight('bold')
    .setBackground('#eef2ff')
    .setFontColor('#111827')
    .setWrap(true);

  sheet.autoResizeColumns(1, columnCount);
}

function seedMachines_(sheet) {
  const existingValues = sheet.getDataRange().getValues();
  const existingMachineNos = {};

  existingValues.slice(1).forEach(function (row) {
    const machineNo = String(row[0]).trim();
    if (machineNo) {
      existingMachineNos[machineNo] = true;
    }
  });

  const newRows = [];
  for (let machineNo = 1; machineNo <= 22; machineNo += 1) {
    const key = String(machineNo);
    if (!existingMachineNos[key]) {
      newRows.push([
        machineNo,
        'Machine ' + machineNo,
        '',
        'Active',
        '',
      ]);
    }
  }

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
}

function seedDefaultOptions_(spreadsheet) {
  seedRows_(spreadsheet.getSheetByName('Masters_DyeingProcesses'), [
    ['DP-001', 'Normal Dyeing', 'Active', ''],
    ['DP-002', 'Bio Wash', 'Active', ''],
    ['DP-003', 'Soft Flow', 'Active', ''],
  ]);

  seedRows_(spreadsheet.getSheetByName('Masters_Addons'), [
    ['AD-001', 'Silicon', 'Active', ''],
    ['AD-002', 'Softener', 'Active', ''],
    ['AD-003', 'Finish', 'Active', ''],
  ]);
}

function seedRows_(sheet, rows) {
  const existingValues = sheet.getDataRange().getValues();
  const existingIds = {};

  existingValues.slice(1).forEach(function (row) {
    const id = String(row[0]).trim();
    if (id) {
      existingIds[id] = true;
    }
  });

  const rowsToAdd = rows.filter(function (row) {
    return !existingIds[String(row[0]).trim()];
  });

  if (rowsToAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
  }
}

function getSheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(function (header) {
    return String(header).trim();
  });

  return values.slice(1)
    .filter(function (row) {
      return row.some(function (value) {
        return String(value).trim() !== '';
      });
    })
    .map(function (row) {
      const record = {};
      headers.forEach(function (header, index) {
        if (header) {
          record[header] = normalizeCellValue_(row[index]);
        }
      });
      return record;
    });
}

function appendObject_(sheet, record) {
  const headers = getHeaders_(sheet);
  const row = headers.map(function (header) {
    return record[header] !== undefined ? record[header] : '';
  });

  sheet.appendRow(row);
}

function upsertObject_(sheet, idColumn, record) {
  const idValue = record[idColumn];
  const rowNumber = findRowByValue_(sheet, idColumn, idValue);

  if (rowNumber) {
    updateObjectAtRow_(sheet, rowNumber, record);
    return;
  }

  appendObject_(sheet, record);
}

function updateObjectAtRow_(sheet, rowNumber, updates) {
  const headers = getHeaders_(sheet);
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const row = range.getValues()[0];

  headers.forEach(function (header, index) {
    if (updates[header] !== undefined) {
      row[index] = updates[header];
    }
  });

  range.setValues([row]);
}

function getObjectFromRow_(sheet, rowNumber) {
  const headers = getHeaders_(sheet);
  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const record = {};

  headers.forEach(function (header, index) {
    record[header] = normalizeCellValue_(row[index]);
  });

  return record;
}

function deleteRowsWhere_(sheet, columnName, value) {
  const headers = getHeaders_(sheet);
  const columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    throw new Error('Column not found: ' + columnName);
  }

  const values = sheet.getDataRange().getValues();
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex -= 1) {
    if (String(values[rowIndex][columnIndex]) === String(value)) {
      sheet.deleteRow(rowIndex + 1);
    }
  }
}

function findRowByValue_(sheet, columnName, value) {
  const headers = getHeaders_(sheet);
  const columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    throw new Error('Column not found: ' + columnName);
  }

  const values = sheet.getDataRange().getValues();
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][columnIndex]) === String(value)) {
      return rowIndex + 1;
    }
  }

  return null;
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (header) {
      return String(header).trim();
    });
}

function makeId_(prefix) {
  return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function toNumber_(value) {
  const number = Number(value);
  return isNaN(number) ? 0 : number;
}

function normalizeCellValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return value;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
