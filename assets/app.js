const API_PATH = '/api/pms';
const CACHE_KEY = 'pms-cache-v1';

const SHEET_NAMES = [
  'PIs',
  'PI_Items',
  'Item_Yarns',
  'Greige_Lots',
  'Dyeing_Lots',
  'Sales_PI_Import',
  'Greige_Lot_Import',
  'Dyeing_Lot_Import',
  'Masters_Customers',
  'Masters_Fabrics',
  'Masters_Yarns',
  'Masters_Machines',
  'Masters_JobWorkers',
  'Masters_DyeingProcesses',
  'Masters_Addons',
];

const MASTER_FIELDS = {
  Masters_Customers: [
    ['customer_name', 'Customer Name', true],
    ['contact_person', 'Contact Person', false],
    ['phone', 'Phone', false],
    ['email', 'Email', false],
    ['address', 'Address', false],
  ],
  Masters_Fabrics: [
    ['fabric_name', 'Fabric Name', true],
    ['default_gsm', 'Default GSM', false],
    ['default_width', 'Default Width/Dia', false],
    ['default_unit', 'Default Unit', false],
  ],
  Masters_Yarns: [
    ['yarn_name', 'Yarn Name', true],
    ['yarn_count', 'Yarn Count', false],
    ['stock_qty', 'Stock Qty', false],
    ['unit', 'Unit', false],
    ['supplier', 'Supplier', false],
  ],
  Masters_JobWorkers: [
    ['job_worker_name', 'Job Worker Name', true],
    ['phone', 'Phone', false],
    ['address', 'Address', false],
    ['work_type', 'Work Type', false],
  ],
  Masters_DyeingProcesses: [
    ['process_name', 'Process Name', true],
  ],
  Masters_Addons: [
    ['addon_name', 'Addon Name', true],
  ],
};

const MASTER_LABELS = {
  Masters_Customers: 'Customers',
  Masters_Fabrics: 'Fabrics',
  Masters_Yarns: 'Yarns',
  Masters_Machines: 'Machines',
  Masters_JobWorkers: 'Job Workers',
  Masters_DyeingProcesses: 'Dyeing Processes',
  Masters_Addons: 'Addons',
};

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  create: 'New PI',
  masters: 'Masters',
};

const state = {
  data: emptyData(),
  selectedPiId: '',
  selectedItemId: '',
  workflow: 'yarns',
  deferredInstall: null,
  lastError: '',
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  bindEvents();
  renderMasterFields();
  addItemEditor();
  restoreCache();
  renderAll();
  syncData();
  registerServiceWorker();
}

function bindEvents() {
  document.addEventListener('click', handleClick);

  document.getElementById('refreshButton').addEventListener('click', function () {
    syncData(true);
  });

  document.getElementById('orderSearch').addEventListener('input', renderOrders);
  document.getElementById('statusFilter').addEventListener('change', renderOrders);

  document.getElementById('createPiForm').addEventListener('submit', handleCreatePi);
  document.getElementById('createPiForm').addEventListener('reset', function () {
    setTimeout(function () {
      document.getElementById('itemEditorList').innerHTML = '';
      addItemEditor();
    }, 0);
  });

  document.getElementById('masterForm').addEventListener('submit', handleMasterSubmit);
  document.getElementById('masterType').addEventListener('change', renderMasterFields);

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    state.deferredInstall = event;
    document.getElementById('installButton').hidden = false;
  });

  document.getElementById('installButton').addEventListener('click', async function () {
    if (!state.deferredInstall) return;
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
    document.getElementById('installButton').hidden = true;
  });
}

function handleClick(event) {
  const viewButton = event.target.closest('[data-view-button]');
  if (viewButton) {
    setView(viewButton.dataset.viewButton);
    return;
  }

  if (event.target.closest('#addItemButton')) {
    addItemEditor();
    return;
  }

  const removeItemButton = event.target.closest('[data-remove-item]');
  if (removeItemButton) {
    const editor = removeItemButton.closest('[data-item-editor]');
    if (document.querySelectorAll('[data-item-editor]').length > 1) {
      editor.remove();
      renumberItemEditors();
    }
    return;
  }

  const piRow = event.target.closest('[data-select-pi]');
  if (piRow) {
    state.selectedPiId = piRow.dataset.selectPi;
    state.selectedItemId = '';
    setView('orders');
    renderOrders();
    return;
  }

  const itemCard = event.target.closest('[data-select-item]');
  if (itemCard) {
    state.selectedItemId = itemCard.dataset.selectItem;
    renderPiDetail();
    return;
  }

  const workflowButton = event.target.closest('[data-workflow]');
  if (workflowButton) {
    state.workflow = workflowButton.dataset.workflow;
    renderPiDetail();
  }
}

function setView(view) {
  document.querySelectorAll('.view').forEach(function (element) {
    element.classList.remove('is-active');
  });
  document.getElementById(view + 'View').classList.add('is-active');

  document.querySelectorAll('[data-view-button]').forEach(function (button) {
    button.classList.toggle('is-active', button.dataset.viewButton === view);
  });

  document.getElementById('viewTitle').textContent = VIEW_TITLES[view] || 'PMS';
}

async function syncData(showSuccess) {
  setSyncState('syncing', 'Syncing...');

  try {
    const result = await apiRequest('readAll', {});
    state.data = normalizeData(result.data);
    saveCache();
    setSyncState('online', 'Synced');
    renderAll();
    if (showSuccess) showToast('Latest data loaded from Google Sheet.');
  } catch (error) {
    state.lastError = error.message;
    setSyncState('error', 'Offline or API not configured');
    renderAll();
    if (showSuccess) showToast(error.message);
  }
}

async function apiRequest(action, payload) {
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: action, payload: payload || {} }),
  });

  if (!response.ok) {
    throw new Error('API request failed. Check Cloudflare function and Apps Script deployment.');
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || 'PMS API returned an error.');
  }

  return result;
}

function restoreCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      state.data = normalizeData(JSON.parse(cached));
      setSyncState('error', 'Showing saved data');
    }
  } catch (error) {
    localStorage.removeItem(CACHE_KEY);
  }
}

function saveCache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state.data));
}

function renderAll() {
  renderDatalists();
  renderDashboard();
  renderOrders();
  renderMasters();
}

function renderDashboard() {
  const pis = rows('PIs');
  const items = rows('PI_Items');
  const openPis = pis.filter(function (pi) {
    return pi.status !== 'Completed';
  }).length;
  const orderedQty = sum(items, 'ordered_qty');
  const producedQty = sum(items, 'greige_produced_qty');
  const receivedQty = sum(items, 'dyeing_received_qty');
  const delayedItems = getDelayedItems();

  document.getElementById('metricGrid').innerHTML = [
    metricCard('Open PIs', openPis),
    metricCard('Ordered Qty', formatNumber(orderedQty)),
    metricCard('Greige Produced', formatNumber(producedQty)),
    metricCard('Dyeing Received', formatNumber(receivedQty)),
  ].join('');

  renderPriorityList(delayedItems);
  renderStatusStack();
}

function renderPriorityList(delayedItems) {
  const urgentPis = rows('PIs').filter(function (pi) {
    return pi.priority === 'Urgent' && pi.status !== 'Completed';
  });
  const shortageItems = rows('PI_Items').filter(function (item) {
    return getYarns(item.pi_item_id).some(function (yarn) {
      return number(yarn.shortage_qty) > 0;
    });
  });

  const entries = [];
  delayedItems.slice(0, 4).forEach(function (item) {
    entries.push({
      title: item.pi_no + ' - ' + item.fabric_name,
      meta: 'Delayed delivery for ' + item.customer_name,
      tag: 'Delayed',
      piId: item.pi_id,
    });
  });
  urgentPis.slice(0, 4).forEach(function (pi) {
    entries.push({
      title: pi.pi_no + ' - ' + pi.customer_name,
      meta: 'Urgent PI',
      tag: 'Urgent',
      piId: pi.pi_id,
    });
  });
  shortageItems.slice(0, 4).forEach(function (item) {
    entries.push({
      title: item.pi_no + ' - ' + item.fabric_name,
      meta: item.colour + ' has yarn shortage',
      tag: 'Yarn',
      piId: item.pi_id,
    });
  });

  document.getElementById('priorityCount').textContent = entries.length + ' open';
  document.getElementById('priorityList').innerHTML = entries.length
    ? entries.slice(0, 8).map(function (entry) {
      return '<button class="queue-item" type="button" data-select-pi="' + escapeHtml(entry.piId) + '">' +
        '<span class="chip warn">' + escapeHtml(entry.tag) + '</span>' +
        '<strong>' + escapeHtml(entry.title) + '</strong>' +
        '<span class="muted">' + escapeHtml(entry.meta) + '</span>' +
      '</button>';
    }).join('')
    : emptyBlock('No urgent work yet.', 'New PIs and shortages will appear here.');
}

function renderStatusStack() {
  const items = rows('PI_Items');
  const groups = groupCount(items, 'status');
  const statuses = ['New', 'Planned', 'In Production', 'Greige Ready', 'In Dyeing', 'Part Received', 'Completed'];
  const max = Math.max.apply(null, statuses.map(function (status) {
    return groups[status] || 0;
  }).concat([1]));

  document.getElementById('statusStack').innerHTML = statuses.map(function (status) {
    const value = groups[status] || 0;
    const width = Math.round((value / max) * 100);
    return '<div class="status-row">' +
      '<strong>' + escapeHtml(status) + '</strong>' +
      '<div class="bar"><span style="width:' + width + '%"></span></div>' +
      '<span class="muted">' + value + '</span>' +
    '</div>';
  }).join('');
}

function renderOrders() {
  const search = document.getElementById('orderSearch').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const pis = rows('PIs').filter(function (pi) {
    const items = getItems(pi.pi_id);
    const haystack = [
      pi.pi_no,
      pi.customer_name,
      pi.sales_manager,
      pi.status,
      items.map(function (item) { return item.fabric_name + ' ' + item.colour; }).join(' '),
    ].join(' ').toLowerCase();
    return (!status || pi.status === status) && (!search || haystack.indexOf(search) !== -1);
  });

  document.getElementById('orderCount').textContent = pis.length + ' PIs';
  document.getElementById('ordersTable').innerHTML = pis.length
    ? pis.map(renderPiRow).join('')
    : '<tr><td colspan="6">' + emptyBlock('No PIs found.', 'Create a PI or change the filters.') + '</td></tr>';

  if (!state.selectedPiId && pis[0]) {
    state.selectedPiId = pis[0].pi_id;
  }

  renderPiDetail();
}

function renderPiRow(pi) {
  const items = getItems(pi.pi_id);
  const totalQty = sum(items, 'ordered_qty');
  return '<tr data-select-pi="' + escapeHtml(pi.pi_id) + '" class="' + (state.selectedPiId === pi.pi_id ? 'is-selected' : '') + '">' +
    '<td><strong>' + escapeHtml(pi.pi_no) + '</strong><br><span class="muted">' + escapeHtml(pi.priority || 'Normal') + '</span></td>' +
    '<td>' + escapeHtml(pi.customer_name) + '<br><span class="muted">' + escapeHtml(pi.sales_manager || '') + '</span></td>' +
    '<td>' + items.length + '</td>' +
    '<td>' + formatNumber(totalQty) + '</td>' +
    '<td>' + escapeHtml(pi.delivery_date || '-') + '</td>' +
    '<td>' + statusChip(pi.status) + '</td>' +
  '</tr>';
}

function renderPiDetail() {
  const panel = document.getElementById('piDetail');
  const pi = rows('PIs').find(function (record) {
    return record.pi_id === state.selectedPiId;
  });

  if (!pi) {
    panel.innerHTML = '<div class="empty-state"><h2>Select a PI</h2><p>Choose any PI to see its live production status.</p></div>';
    return;
  }

  const items = getItems(pi.pi_id);
  if (!state.selectedItemId && items[0]) {
    state.selectedItemId = items[0].pi_item_id;
  }
  const selectedItem = items.find(function (item) {
    return item.pi_item_id === state.selectedItemId;
  }) || items[0];

  panel.innerHTML = '<div class="panel-heading">' +
    '<div><h2>' + escapeHtml(pi.pi_no) + '</h2><span class="muted">' + escapeHtml(pi.customer_name) + '</span></div>' +
    statusChip(pi.status) +
  '</div>' +
  '<div class="pi-summary">' +
    summaryTile('Items', items.length) +
    summaryTile('Ordered', formatNumber(sum(items, 'ordered_qty'))) +
    summaryTile('Received', formatNumber(sum(items, 'dyeing_received_qty'))) +
  '</div>' +
  '<div class="item-list">' + items.map(renderItemCard).join('') + '</div>' +
  (selectedItem ? renderWorkflow(selectedItem) : '');

  bindWorkflowForms();
}

function renderItemCard(item) {
  const isSelected = item.pi_item_id === state.selectedItemId;
  return '<button class="item-card ' + (isSelected ? 'is-selected' : '') + '" type="button" data-select-item="' + escapeHtml(item.pi_item_id) + '">' +
    '<div class="item-card-head">' +
      '<div><strong>' + escapeHtml(item.fabric_name) + '</strong><div class="item-meta">' +
        '<span>' + escapeHtml(item.colour) + '</span>' +
        '<span>' + formatNumber(item.ordered_qty) + ' ' + escapeHtml(item.unit || 'Kg') + '</span>' +
        '<span>GSM ' + escapeHtml(item.gsm || '-') + '</span>' +
      '</div></div>' +
      statusChip(item.status) +
    '</div>' +
    '<div class="progress-grid">' +
      progressTile('Greige', item.greige_produced_qty, item.ordered_qty) +
      progressTile('Dyeing Sent', item.dyeing_sent_qty, item.ordered_qty) +
      progressTile('Received', item.dyeing_received_qty, item.ordered_qty) +
    '</div>' +
  '</button>';
}

function renderWorkflow(item) {
  return '<div class="workflow-panel">' +
    '<div class="workflow-tabs">' +
      workflowButton('yarns', 'Yarns') +
      workflowButton('greige', 'Greige Lots') +
      workflowButton('dyeing', 'Dyeing') +
    '</div>' +
    renderWorkflowBody(item) +
  '</div>';
}

function renderWorkflowBody(item) {
  if (state.workflow === 'greige') {
    return renderGreigeForm(item);
  }
  if (state.workflow === 'dyeing') {
    return renderDyeingForm(item);
  }
  return renderYarnForm(item);
}

function renderYarnForm(item) {
  const yarns = getYarns(item.pi_item_id);
  const rowsHtml = [0, 1, 2].map(function (index) {
    const yarn = yarns[index] || {};
    return '<div class="form-grid compact">' +
      '<label><span>Yarn ' + (index + 1) + '</span><input name="yarn_name_' + index + '" list="yarnsList" value="' + escapeAttr(yarn.yarn_name || '') + '" placeholder="Yarn/count"></label>' +
      '<label><span>Blend %</span><input name="blend_percent_' + index + '" value="' + escapeAttr(yarn.blend_percent || '') + '" placeholder="60"></label>' +
      '<label><span>Required</span><input name="required_qty_' + index + '" type="number" step="0.01" min="0" value="' + escapeAttr(yarn.required_qty || '') + '"></label>' +
      '<label><span>Stock</span><input name="stock_available_qty_' + index + '" type="number" step="0.01" min="0" value="' + escapeAttr(yarn.stock_available_qty || '') + '"></label>' +
      '<label><span>Remarks</span><input name="remarks_' + index + '" value="' + escapeAttr(yarn.remarks || '') + '"></label>' +
    '</div>';
  }).join('');

  return '<form id="yarnForm" class="stack-form">' +
    '<h3>' + escapeHtml(item.fabric_name) + ' / ' + escapeHtml(item.colour) + '</h3>' +
    rowsHtml +
    '<button class="primary-button" type="submit">Save Yarns</button>' +
  '</form>' +
  renderMiniList('Current Yarns', yarns, function (yarn) {
    return '<strong>' + escapeHtml(yarn.yarn_name) + '</strong><span>' +
      escapeHtml(yarn.blend_percent || '-') + '% - Shortage ' + formatNumber(yarn.shortage_qty) + '</span>';
  });
}

function renderGreigeForm(item) {
  const lots = getGreigeLots(item.pi_item_id);
  const machines = rows('Masters_Machines');
  const workers = rows('Masters_JobWorkers');
  const machineOptions = machines.map(function (machine) {
    return '<option value="' + escapeAttr(machine.machine_no) + '">' + escapeHtml(machine.machine_name || ('Machine ' + machine.machine_no)) + '</option>';
  }).join('');
  const workerOptions = workers.map(function (worker) {
    return '<option value="' + escapeAttr(worker.job_worker_name) + '">';
  }).join('');

  return '<form id="greigeForm" class="stack-form">' +
    '<div class="form-grid">' +
      '<label><span>Lot No</span><input name="greige_lot_no" placeholder="Auto if blank"></label>' +
      '<label><span>Received Date</span><input name="received_date" type="date" value="' + todayIso() + '"></label>' +
      '<label><span>Source</span><select name="source_type"><option>In-house</option><option>Job worker</option></select></label>' +
      '<label><span>Machine</span><select name="machine_no"><option value="">Select</option>' + machineOptions + '</select></label>' +
      '<label><span>Job Worker</span><input name="job_worker_name" list="jobWorkersList" placeholder="Outside worker"></label>' +
      '<label><span>Rolls</span><input name="rolls" type="number" step="1" min="0"></label>' +
      '<label><span>Weight</span><input name="weight_qty" type="number" step="0.01" min="0"></label>' +
      '<label><span>Unit</span><select name="unit"><option>Kg</option><option>Meter</option></select></label>' +
    '</div>' +
    '<datalist id="jobWorkersList">' + workerOptions + '</datalist>' +
    '<label><span>Remarks</span><input name="remarks" placeholder="Shift, roll or fabric notes"></label>' +
    '<button class="primary-button" type="submit">Add Greige Lot</button>' +
  '</form>' +
  renderMiniList('Greige Lots', lots, function (lot) {
    const source = lot.source_type === 'Job worker' ? lot.job_worker_name : 'Machine ' + lot.machine_no;
    return '<strong>' + escapeHtml(lot.greige_lot_no || '-') + ' - ' + escapeHtml(source || '-') + '</strong><span>' +
      formatNumber(lot.rolls) + ' rolls / ' + formatNumber(lot.weight_qty) + ' ' + escapeHtml(lot.unit || 'Kg') + '</span>';
  });
}

function renderDyeingForm(item) {
  const lots = getDyeingLots(item.pi_item_id);
  const greigeLots = getGreigeLots(item.pi_item_id);
  const processes = rows('Masters_DyeingProcesses').map(function (process) {
    return '<option value="' + escapeAttr(process.process_name) + '">' + escapeHtml(process.process_name) + '</option>';
  }).join('');
  const greigeOptions = greigeLots.map(function (lot) {
    return '<option value="' + escapeAttr(lot.greige_lot_no) + '">' + escapeHtml(lot.greige_lot_no) + ' - ' + formatNumber(lot.weight_qty) + ' ' + escapeHtml(lot.unit || 'Kg') + '</option>';
  }).join('');
  const addons = rows('Masters_Addons').map(function (addon) {
    return addon.addon_name;
  }).join(', ');

  return '<form id="dyeingForm" class="stack-form">' +
    '<div class="form-grid">' +
      '<label><span>Greige Lot</span><select name="greige_lot_no"><option value="">Select</option>' + greigeOptions + '</select></label>' +
      '<label><span>Dyeing Party</span><input name="dyeing_party" placeholder="Dyeing house"></label>' +
      '<label><span>Sent Date</span><input name="sent_date" type="date" value="' + todayIso() + '"></label>' +
      '<label><span>Sent Rolls</span><input name="sent_rolls" type="number" step="1" min="0"></label>' +
      '<label><span>Sent Weight</span><input name="sent_weight" type="number" step="0.01" min="0"></label>' +
      '<label><span>Colour</span><input name="colour" value="' + escapeAttr(item.colour || '') + '"></label>' +
      '<label><span>Process</span><select name="process_type"><option value="">Select</option>' + processes + '</select></label>' +
      '<label><span>Received Date</span><input name="received_date" type="date"></label>' +
      '<label><span>Received Rolls</span><input name="received_rolls" type="number" step="1" min="0"></label>' +
      '<label><span>Received Weight</span><input name="received_weight" type="number" step="0.01" min="0"></label>' +
      '<label><span>Loss Weight</span><input name="loss_weight" type="number" step="0.01" min="0"></label>' +
      '<label><span>Addons</span><input name="addons" placeholder="' + escapeAttr(addons || 'Silicon, Softener') + '"></label>' +
    '</div>' +
    '<label><span>Remarks</span><input name="remarks" placeholder="Dyeing or finish notes"></label>' +
    '<button class="primary-button" type="submit">Add Dyeing</button>' +
  '</form>' +
  renderMiniList('Dyeing Lots', lots, function (lot) {
    return '<strong>' + escapeHtml(lot.greige_lot_no || '-') + ' - ' + escapeHtml(lot.dyeing_party || '-') + '</strong><span>' +
      formatNumber(lot.received_rolls) + ' rolls / ' + formatNumber(lot.received_weight) + ' received from ' +
      formatNumber(lot.sent_rolls) + ' rolls / ' + formatNumber(lot.sent_weight) + ' sent</span>';
  });
}

function bindWorkflowForms() {
  const yarnForm = document.getElementById('yarnForm');
  const greigeForm = document.getElementById('greigeForm');
  const dyeingForm = document.getElementById('dyeingForm');

  if (yarnForm) {
    yarnForm.addEventListener('submit', handleYarnSubmit);
  }
  if (greigeForm) {
    greigeForm.addEventListener('submit', handleGreigeSubmit);
  }
  if (dyeingForm) {
    dyeingForm.addEventListener('submit', handleDyeingSubmit);
  }
}

async function handleCreatePi(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const pi = objectFromForm(form);
  const items = Array.from(document.querySelectorAll('[data-item-editor]')).map(function (editor) {
    return objectFromForm(editor);
  }).filter(function (item) {
    return item.fabric_name && item.colour && number(item.ordered_qty) > 0;
  });

  if (items.length === 0) {
    showToast('Add at least one valid PI item.');
    return;
  }

  await submitAction('createPi', { pi: pi, items: items }, function () {
    form.reset();
    document.getElementById('itemEditorList').innerHTML = '';
    addItemEditor();
    const savedPi = rows('PIs').find(function (record) {
      return record.pi_no === pi.pi_no;
    });
    if (savedPi) state.selectedPiId = savedPi.pi_id;
    renderOrders();
    setView('orders');
  });
}

async function handleYarnSubmit(event) {
  event.preventDefault();
  const itemId = state.selectedItemId;
  const form = event.currentTarget;
  const yarns = [0, 1, 2].map(function (index) {
    return {
      yarn_name: form.elements['yarn_name_' + index].value.trim(),
      blend_percent: form.elements['blend_percent_' + index].value.trim(),
      required_qty: form.elements['required_qty_' + index].value,
      stock_available_qty: form.elements['stock_available_qty_' + index].value,
      remarks: form.elements['remarks_' + index].value.trim(),
    };
  }).filter(function (yarn) {
    return yarn.yarn_name || number(yarn.required_qty) > 0 || number(yarn.stock_available_qty) > 0;
  });

  await submitAction('saveItemYarns', { pi_item_id: itemId, yarns: yarns });
}

async function handleGreigeSubmit(event) {
  event.preventDefault();
  const payload = objectFromForm(event.currentTarget);
  payload.pi_item_id = state.selectedItemId;
  await submitAction('addGreigeLot', payload, function () {
    event.currentTarget.reset();
  });
}

async function handleDyeingSubmit(event) {
  event.preventDefault();
  const payload = objectFromForm(event.currentTarget);
  payload.pi_item_id = state.selectedItemId;
  await submitAction('addDyeingLot', payload, function () {
    event.currentTarget.reset();
  });
}

async function handleMasterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const sheetName = form.elements.sheetName.value;
  const record = objectFromForm(form);
  delete record.sheetName;
  record.status = 'Active';

  await submitAction('upsertMaster', { sheetName: sheetName, record: record }, function () {
    form.reset();
    document.getElementById('masterType').value = sheetName;
    renderMasterFields();
  });
}

async function submitAction(action, payload, afterSuccess) {
  setSyncState('syncing', 'Saving...');

  try {
    const result = await apiRequest(action, payload);
    state.data = normalizeData(result.data);
    saveCache();
    setSyncState('online', 'Synced');
    renderAll();
    if (afterSuccess) afterSuccess();
    showToast('Saved successfully.');
  } catch (error) {
    setSyncState('error', 'Save failed');
    showToast(error.message);
  }
}

function addItemEditor() {
  const template = document.getElementById('itemEditorTemplate');
  const clone = template.content.cloneNode(true);
  document.getElementById('itemEditorList').appendChild(clone);
  renumberItemEditors();
}

function renumberItemEditors() {
  document.querySelectorAll('[data-item-editor]').forEach(function (editor, index) {
    editor.querySelector('[data-line-label]').textContent = 'Item ' + (index + 1);
  });
}

function renderMasterFields() {
  const sheetName = document.getElementById('masterType').value;
  const fields = MASTER_FIELDS[sheetName] || [];
  document.getElementById('masterFields').innerHTML = fields.map(function (field) {
    return '<label><span>' + escapeHtml(field[1]) + '</span><input name="' + escapeAttr(field[0]) + '" ' +
      (field[2] ? 'required ' : '') + '></label>';
  }).join('');
}

function renderMasters() {
  const visibleMasters = [
    'Masters_Customers',
    'Masters_Fabrics',
    'Masters_Yarns',
    'Masters_Machines',
    'Masters_JobWorkers',
    'Masters_DyeingProcesses',
    'Masters_Addons',
  ];

  document.getElementById('masterList').innerHTML = visibleMasters.map(function (sheetName) {
    const records = rows(sheetName);
    return '<div class="master-card">' +
      '<strong>' + escapeHtml(MASTER_LABELS[sheetName]) + '</strong>' +
      '<span>' + records.length + ' records</span>' +
      '<div class="mini-list">' + records.slice(0, 4).map(function (record) {
        return '<div class="mini-row"><span>' + escapeHtml(getMasterName(sheetName, record)) + '</span><span class="muted">' + escapeHtml(record.status || '') + '</span></div>';
      }).join('') + '</div>' +
    '</div>';
  }).join('');
}

function renderDatalists() {
  document.getElementById('customersList').innerHTML = rows('Masters_Customers').map(function (customer) {
    return '<option value="' + escapeAttr(customer.customer_name) + '">';
  }).join('');
  document.getElementById('fabricsList').innerHTML = rows('Masters_Fabrics').map(function (fabric) {
    return '<option value="' + escapeAttr(fabric.fabric_name) + '">';
  }).join('');
  document.getElementById('yarnsList').innerHTML = rows('Masters_Yarns').map(function (yarn) {
    return '<option value="' + escapeAttr(yarn.yarn_name) + '">';
  }).join('');
}

function metricCard(label, value) {
  return '<article class="metric-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
}

function summaryTile(label, value) {
  return '<div><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
}

function progressTile(label, value, total) {
  return '<div class="progress-tile"><span>' + escapeHtml(label) + '</span><strong>' +
    formatNumber(value) + ' / ' + formatNumber(total) + '</strong></div>';
}

function workflowButton(key, label) {
  return '<button type="button" class="tab-button ' + (state.workflow === key ? 'is-active' : '') + '" data-workflow="' + key + '">' + escapeHtml(label) + '</button>';
}

function renderMiniList(title, records, renderer) {
  return '<div class="mini-list" style="margin-top:14px">' +
    '<strong>' + escapeHtml(title) + '</strong>' +
    (records.length ? records.map(function (record) {
      return '<div class="mini-row">' + renderer(record) + '</div>';
    }).join('') : '<span class="muted">No entries yet.</span>') +
  '</div>';
}

function emptyBlock(title, text) {
  return '<div class="empty-state"><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(text) + '</p></div>';
}

function statusChip(status) {
  const value = status || 'New';
  let tone = '';
  if (value === 'Completed' || value === 'Available' || value === 'Received') tone = ' good';
  if (value === 'Urgent' || value === 'Shortage' || value === 'Part Received') tone = ' warn';
  if (value === 'Cancelled' || value === 'Delayed') tone = ' bad';
  return '<span class="chip' + tone + '">' + escapeHtml(value) + '</span>';
}

function setSyncState(stateName, text) {
  const dot = document.getElementById('syncDot');
  dot.classList.toggle('is-online', stateName === 'online');
  dot.classList.toggle('is-error', stateName === 'error');
  document.getElementById('syncText').textContent = text;
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.remove();
  }, 4200);
}

function rows(sheetName) {
  return state.data[sheetName] || [];
}

function getItems(piId) {
  return rows('PI_Items').filter(function (item) {
    return item.pi_id === piId;
  });
}

function getYarns(piItemId) {
  return rows('Item_Yarns').filter(function (record) {
    return record.pi_item_id === piItemId;
  });
}

function getGreigeLots(piItemId) {
  return rows('Greige_Lots').filter(function (record) {
    return record.pi_item_id === piItemId;
  });
}

function getDyeingLots(piItemId) {
  return rows('Dyeing_Lots').filter(function (record) {
    return record.pi_item_id === piItemId;
  });
}

function getDelayedItems() {
  const today = todayIso();
  const piMap = Object.fromEntries(rows('PIs').map(function (pi) {
    return [pi.pi_id, pi];
  }));

  return rows('PI_Items').filter(function (item) {
    const pi = piMap[item.pi_id];
    return pi && pi.delivery_date && pi.delivery_date < today && item.status !== 'Completed';
  }).map(function (item) {
    return Object.assign({}, item, {
      customer_name: piMap[item.pi_id].customer_name,
    });
  });
}

function sum(records, key) {
  return records.reduce(function (total, record) {
    return total + number(record[key]);
  }, 0);
}

function groupCount(records, key) {
  return records.reduce(function (groups, record) {
    const value = record[key] || 'New';
    groups[value] = (groups[value] || 0) + 1;
    return groups;
  }, {});
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  const parsed = number(value);
  return parsed.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function objectFromForm(formOrContainer) {
  const record = {};
  const fields = formOrContainer.querySelectorAll('input, select, textarea');
  fields.forEach(function (field) {
    if (!field.name) return;
    record[field.name] = field.value.trim();
  });
  return record;
}

function getMasterName(sheetName, record) {
  if (sheetName === 'Masters_Customers') return record.customer_name;
  if (sheetName === 'Masters_Fabrics') return record.fabric_name;
  if (sheetName === 'Masters_Yarns') return record.yarn_name;
  if (sheetName === 'Masters_Machines') return record.machine_name || ('Machine ' + record.machine_no);
  if (sheetName === 'Masters_JobWorkers') return record.job_worker_name;
  if (sheetName === 'Masters_DyeingProcesses') return record.process_name;
  if (sheetName === 'Masters_Addons') return record.addon_name;
  return '';
}

function normalizeData(data) {
  const normalized = emptyData();
  SHEET_NAMES.forEach(function (sheetName) {
    normalized[sheetName] = Array.isArray(data && data[sheetName]) ? data[sheetName] : [];
  });
  return normalized;
}

function emptyData() {
  return SHEET_NAMES.reduce(function (data, sheetName) {
    data[sheetName] = [];
    return data;
  }, {});
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      // The app still works without offline shell caching.
    });
  }
}
