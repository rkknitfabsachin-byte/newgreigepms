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
  Masters_DyeingHouses: [
    ['dyeing_house_name', 'Dyeing House Name', true],
    ['phone', 'Phone', false],
    ['address', 'Address', false],
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
  Masters_DyeingHouses: 'Dyeing Houses',
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
  expandedGroups: {},
  detailColourFilter: '',
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
  var viewButton = event.target.closest('[data-view-button]');
  if (viewButton) {
    setView(viewButton.dataset.viewButton);
    return;
  }

  if (event.target.closest('#addItemButton')) {
    addItemEditor();
    return;
  }

  var removeItemButton = event.target.closest('[data-remove-item]');
  if (removeItemButton) {
    var editor = removeItemButton.closest('[data-item-editor]');
    if (document.querySelectorAll('[data-item-editor]').length > 1) {
      editor.remove();
      renumberItemEditors();
    }
    return;
  }

  var groupToggle = event.target.closest('[data-toggle-group]');
  if (groupToggle) {
    var key = groupToggle.dataset.toggleGroup;
    state.expandedGroups[key] = !state.expandedGroups[key];
    renderPiDetail();
    return;
  }

  var piRow = event.target.closest('[data-select-pi]');
  if (piRow) {
    state.selectedPiId = piRow.dataset.selectPi;
    state.selectedItemId = '';
    state.detailColourFilter = '';
    setView('orders');
    renderOrders();
    return;
  }

  var itemCard = event.target.closest('[data-select-item]');
  if (itemCard) {
    state.selectedItemId = itemCard.dataset.selectItem;
    renderPiDetail();
    return;
  }

  var workflowButton = event.target.closest('[data-workflow]');
  if (workflowButton) {
    state.workflow = workflowButton.dataset.workflow;
    renderPiDetail();
    return;
  }

  var colourChip = event.target.closest('[data-detail-colour]');
  if (colourChip) {
    state.detailColourFilter = colourChip.dataset.detailColour;
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
  var pis = rows('PIs');
  var items = rows('PI_Items');
  var openPis = pis.filter(function (pi) { return pi.status !== 'Completed'; }).length;
  var orderedQty = sum(items, 'ordered_qty');
  var producedQty = sum(items, 'greige_produced_qty');
  var dyeingSentQty = sum(items, 'dyeing_sent_qty');
  var receivedQty = sum(items, 'dyeing_received_qty');
  var delayedItems = getDelayedItems();
  var completedItems = items.filter(function (i) { return i.status === 'Completed'; }).length;
  var completionPct = items.length > 0 ? Math.round((completedItems / items.length) * 100) : 0;

  document.getElementById('metricGrid').innerHTML = [
    metricCardEx('Total PIs', pis.length, openPis + ' open', 'brand'),
    metricCardEx('Ordered', formatNumber(orderedQty), items.length + ' items', ''),
    metricCardEx('Kora', formatNumber(producedQty), pctOf(producedQty, orderedQty) + '% received', 'good'),
    metricCardEx('In Dyeing', formatNumber(dyeingSentQty), formatNumber(Math.max(dyeingSentQty - receivedQty, 0)) + ' pending', 'warn'),
    metricCardEx('Received', formatNumber(receivedQty), pctOf(receivedQty, orderedQty) + '% done', 'good'),
    metricCardEx('Delayed', delayedItems.length, delayedItems.length > 0 ? 'Action needed' : 'On track', delayedItems.length > 0 ? 'bad' : 'good'),
  ].join('');

  renderPipeline(items);
  renderPiProgressCards(pis);
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
  const statuses = ['New', 'Planned', 'Kora Received', 'Kora Ready', 'In Dyeing', 'Part Received', 'Completed'];
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

function renderPipeline(items) {
  var stages = [
    { key: 'New', label: 'New', icon: '○' },
    { key: 'Planned', label: 'Planned', icon: '◐' },
    { key: 'Kora Received', label: 'Kora', icon: '◧' },
    { key: 'In Dyeing', label: 'Dyeing', icon: '◑' },
    { key: 'Part Received', label: 'Part Rcvd', icon: '◕' },
    { key: 'Completed', label: 'Done', icon: '●' },
  ];
  var counts = groupCount(items, 'status');
  var total = Math.max(items.length, 1);
  document.getElementById('pipelinePanel').innerHTML =
    '<div class="panel-heading"><h2>Production Pipeline</h2><span class="muted">' + items.length + ' items</span></div>' +
    '<div class="pipeline">' + stages.map(function (stage, i) {
      var count = (counts[stage.key] || 0) + (stage.key === 'Kora Received' ? (counts['Kora Ready'] || 0) : 0);
      var pct = Math.round((count / total) * 100);
      return '<div class="pipeline-stage">' +
        '<div class="pipeline-icon">' + stage.icon + '</div>' +
        '<div class="pipeline-count">' + count + '</div>' +
        '<div class="pipeline-label">' + stage.label + '</div>' +
        '<div class="pipeline-bar"><span style="width:' + pct + '%"></span></div>' +
      '</div>' + (i < stages.length - 1 ? '<div class="pipeline-arrow">→</div>' : '');
    }).join('') + '</div>';
}

function renderPiProgressCards(pis) {
  var activePis = pis.filter(function (pi) { return pi.status !== 'Completed'; });
  var container = document.getElementById('piProgressSection');
  if (activePis.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="panel"><div class="panel-heading"><h2>Active Orders</h2><span class="muted">' + activePis.length + ' in progress</span></div>' +
    '<div class="pi-progress-grid">' + activePis.slice(0, 12).map(function (pi) {
      var piItems = getItems(pi.pi_id);
      var ordered = sum(piItems, 'ordered_qty');
      var received = sum(piItems, 'dyeing_received_qty');
      var greige = sum(piItems, 'greige_produced_qty');
      var pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
      var gPct = ordered > 0 ? Math.round((greige / ordered) * 100) : 0;
      var isDelayed = pi.delivery_date && pi.delivery_date < todayIso();
      return '<button class="pi-progress-card' + (isDelayed ? ' is-delayed' : '') + '" type="button" data-select-pi="' + escapeAttr(pi.pi_id) + '">' +
        '<div class="pi-prog-head"><strong>' + escapeHtml(pi.pi_no) + '</strong>' + statusChip(pi.status) + '</div>' +
        '<span class="muted">' + escapeHtml(pi.customer_name) + '</span>' +
        '<div class="pi-prog-bars">' +
          '<div class="prog-row"><span>Kora</span><div class="prog-track"><div class="prog-fill greige" style="width:' + gPct + '%"></div></div><span>' + gPct + '%</span></div>' +
          '<div class="prog-row"><span>Final</span><div class="prog-track"><div class="prog-fill final" style="width:' + pct + '%"></div></div><span>' + pct + '%</span></div>' +
        '</div>' +
        '<div class="pi-prog-foot">' +
          (pi.delivery_date ? '<span class="pi-prog-date' + (isDelayed ? ' delayed' : '') + '">' + escapeHtml(pi.delivery_date) + '</span>' : '<span></span>') +
          '<span class="text-button" style="margin-left: auto;">Update</span>' +
        '</div>' +
      '</button>';
    }).join('') + '</div></div>';
}

function renderOrders() {
  const search = document.getElementById('orderSearch').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const colourFilter = document.getElementById('colourFilter').value.trim().toLowerCase();
  const pis = rows('PIs').filter(function (pi) {
    const items = getItems(pi.pi_id);
    const haystack = [
      pi.pi_no,
      pi.customer_name,
      pi.sales_manager,
      pi.status,
      items.map(function (item) { return item.fabric_name + ' ' + item.colour; }).join(' '),
    ].join(' ').toLowerCase();
    
    const matchesColour = !colourFilter || items.some(function(item) {
      return (item.colour || '').toLowerCase().indexOf(colourFilter) !== -1;
    });

    return (!status || pi.status === status) && (!search || haystack.indexOf(search) !== -1) && matchesColour;
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
  var panel = document.getElementById('piDetail');
  var pi = rows('PIs').find(function (record) {
    return record.pi_id === state.selectedPiId;
  });

  if (!pi) {
    panel.innerHTML = '<div class="empty-state"><h2>Select a PI</h2><p>Choose any PI to see its live production status.</p></div>';
    return;
  }

  var items = getItems(pi.pi_id);
  var uniqueColours = [];
  items.forEach(function(i) {
    if (i.colour && uniqueColours.indexOf(i.colour) === -1) uniqueColours.push(i.colour);
  });
  uniqueColours.sort();

  var filteredItems = items;
  if (state.detailColourFilter) {
    filteredItems = items.filter(function(i) { return i.colour === state.detailColourFilter; });
  }

  if (!state.selectedItemId && filteredItems[0]) {
    state.selectedItemId = filteredItems[0].pi_item_id;
  }
  var selectedItem = filteredItems.find(function (item) {
    return item.pi_item_id === state.selectedItemId;
  }) || filteredItems[0];

  var colourBar = '<div class="colour-bar">' +
    '<button class="colour-chip' + (!state.detailColourFilter ? ' is-active' : '') + '" data-detail-colour="">All Colours</button>' +
    uniqueColours.map(function(c) {
      return '<button class="colour-chip' + (state.detailColourFilter === c ? ' is-active' : '') + '" data-detail-colour="' + escapeAttr(c) + '">' + escapeHtml(c) + '</button>';
    }).join('') +
  '</div>';

  var groups = buildFabricGroups(filteredItems);

  panel.innerHTML = '<div class="panel-heading">' +
    '<div><h2>' + escapeHtml(pi.pi_no) + '</h2><span class="muted">' + escapeHtml(pi.customer_name) + '</span></div>' +
    statusChip(pi.status) +
  '</div>' +
  colourBar +
  '<div class="pi-summary">' +
    summaryTile('Items', filteredItems.length + (state.detailColourFilter ? ' of ' + items.length : '')) +
    summaryTile('Fab Groups', groups.length) +
    summaryTile('Ordered', formatNumber(sum(filteredItems, 'ordered_qty'))) +
    summaryTile('Kora', formatNumber(sum(filteredItems, 'greige_produced_qty'))) +
    summaryTile('Received', formatNumber(sum(filteredItems, 'dyeing_received_qty'))) +
  '</div>' +
  renderGroupedItems(groups) +
  (selectedItem ? renderWorkflow(selectedItem) : '');

  bindWorkflowForms();
}

function buildFabricGroups(items) {
  var groupMap = {};
  var groupOrder = [];
  items.forEach(function (item) {
    var key = getGroupKey(item);
    if (!groupMap[key]) {
      groupMap[key] = { key: key, fabric_name: item.fabric_name, gsm: item.gsm, width: item.width, items: [] };
      groupOrder.push(key);
    }
    groupMap[key].items.push(item);
  });
  return groupOrder.map(function (key) { return groupMap[key]; });
}

function getGroupKey(item) {
  return [normalizeKey(item.pi_id || ''), normalizeKey(item.fabric_name || ''), normalizeKey(item.gsm || ''), normalizeKey(item.width || '')].join('|');
}

function renderGroupedItems(groups) {
  return '<div class="grouped-items">' + groups.map(function (group) {
    var isExpanded = state.expandedGroups[group.key] !== false;
    var totalOrdered = sum(group.items, 'ordered_qty');
    var totalReceived = sum(group.items, 'dyeing_received_qty');
    var pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
    var colours = group.items.map(function (i) { return i.colour; }).join(', ');
    return '<div class="fabric-group">' +
      '<button class="fabric-group-header" type="button" data-toggle-group="' + escapeAttr(group.key) + '">' +
        '<div class="fg-left">' +
          '<span class="fg-chevron' + (isExpanded ? ' is-open' : '') + '">▸</span>' +
          '<div><strong>' + escapeHtml(group.fabric_name) + '</strong>' +
            '<span class="fg-meta">' + group.items.length + ' colour' + (group.items.length > 1 ? 's' : '') +
            ' · ' + formatNumber(totalOrdered) + ' total' +
            (group.gsm ? ' · GSM ' + escapeHtml(group.gsm) : '') +
            (group.width ? ' · ' + escapeHtml(group.width) : '') + '</span></div>' +
        '</div>' +
        '<div class="fg-right">' +
          '<div class="fg-progress"><div class="prog-track"><div class="prog-fill final" style="width:' + pct + '%"></div></div></div>' +
          '<span class="fg-pct">' + pct + '%</span>' +
        '</div>' +
      '</button>' +
      '<div class="fabric-group-body' + (isExpanded ? '' : ' is-collapsed') + '">' +
        group.items.map(renderItemCard).join('') +
      '</div>' +
    '</div>';
  }).join('') + '</div>';
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
      progressTile('Kora', item.greige_produced_qty, item.ordered_qty) +
      progressTile('Dyeing Sent', item.dyeing_sent_qty, item.ordered_qty) +
      progressTile('Received', item.dyeing_received_qty, item.ordered_qty) +
    '</div>' +
  '</button>';
}

function renderWorkflow(item) {
  return '<div class="workflow-panel">' +
    '<div class="workflow-tabs">' +
      workflowButton('yarns', 'Yarns') +
      workflowButton('greige', 'Kora Lots') +
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
  var groupItems = getFabricGroupItems(item);
  var groupYarns = getGroupYarns(groupItems);
  var rowsHtml = [0, 1, 2].map(function (index) {
    var yarn = groupYarns[index] || {};
    return '<div class="form-grid compact">' +
      '<label><span>Yarn ' + (index + 1) + '</span><input name="yarn_name_' + index + '" list="yarnsList" value="' + escapeAttr(yarn.yarn_name || '') + '" placeholder="Yarn/count"></label>' +
      '<label><span>Blend %</span><input name="blend_percent_' + index + '" value="' + escapeAttr(yarn.blend_percent || '') + '" placeholder="60"></label>' +
      '<label><span>Required</span><input name="required_qty_' + index + '" type="number" step="0.01" min="0" value="' + escapeAttr(yarn.required_qty || '') + '"></label>' +
      '<label><span>Stock</span><input name="stock_available_qty_' + index + '" type="number" step="0.01" min="0" value="' + escapeAttr(yarn.stock_available_qty || '') + '"></label>' +
      '<label><span>Remarks</span><input name="remarks_' + index + '" value="' + escapeAttr(yarn.remarks || '') + '"></label>' +
    '</div>';
  }).join('');

  var colours = groupItems.map(function (i) { return i.colour; }).join(', ');
  return '<form id="yarnForm" class="stack-form">' +
    '<h3>Yarn plan for ' + escapeHtml(item.fabric_name) + '</h3>' +
    '<p class="muted" style="margin:0">Shared across ' + groupItems.length + ' colour' + (groupItems.length > 1 ? 's' : '') + ': ' + escapeHtml(colours) + '</p>' +
    rowsHtml +
    '<button class="primary-button" type="submit">Save Yarns (all colours)</button>' +
  '</form>' +
  renderMiniList('Current Yarns', groupYarns, function (yarn) {
    return '<strong>' + escapeHtml(yarn.yarn_name) + '</strong><span>' +
      escapeHtml(yarn.blend_percent || '-') + '% - Shortage ' + formatNumber(yarn.shortage_qty) + '</span>';
  });
}

function renderGreigeForm(item) {
  const groupItems = getFabricGroupItems(item);
  const groupOrderedQty = sum(groupItems, 'ordered_qty');
  const lots = getGreigeLotsForGroup(item);
  const groupKoraQty = sum(lots, 'weight_qty');
  const groupSentQty = sum(lots, 'dyeing_sent_weight');
  const groupBalance = groupKoraQty - groupSentQty;
  
  const machines = rows('Masters_Machines');
  const machineOptions = machines.map(function (machine) {
    return '<option value="' + escapeAttr(machine.machine_no) + '">' + escapeHtml(machine.machine_name || ('Machine ' + machine.machine_no)) + '</option>';
  }).join('');

  return '<div class="pi-summary">' +
    summaryTile('Kora Received', formatNumber(groupKoraQty)) +
    summaryTile('Kora Dispatched', formatNumber(groupSentQty)) +
    summaryTile('Balance Available', formatNumber(groupBalance)) +
  '</div>' +
  '<form id="greigeForm" class="stack-form">' +
    '<h3>Add Kora Receipt for ' + escapeHtml(item.fabric_name) + '</h3>' +
    '<div class="form-grid">' +
      '<label><span>Receipt No</span><input name="greige_lot_no" placeholder="Auto if blank"></label>' +
      '<label><span>Date</span><input name="received_date" type="date" value="' + todayIso() + '"></label>' +
      '<label><span>Machine</span><select name="machine_no"><option value="">Select</option>' + machineOptions + '</select></label>' +
      '<label><span>Rolls</span><input name="rolls" type="number" step="1" min="0"></label>' +
      '<label><span>Weight</span><input name="weight_qty" type="number" step="0.01" min="0"></label>' +
      '<label><span>Source</span><select name="source_type"><option>In-house</option><option>Job worker</option></select></label>' +
    '</div>' +
    '<button class="primary-button" type="submit">Add Kora Receipt</button>' +
  '</form>' +
  '<details style="margin-top:12px; font-size:13px;"><summary class="muted">View Individual Receipts</summary>' +
  renderMiniList('Receipts', lots, function (lot) {
    const source = lot.source_type === 'Job worker' ? lot.job_worker_name : 'Machine ' + lot.machine_no;
    return '<strong>' + escapeHtml(lot.greige_lot_no || '-') + '</strong><span>' +
      formatNumber(lot.weight_qty) + ' ' + escapeHtml(lot.unit || 'Kg') + ' - bal ' + formatNumber(lot.balance_weight) + '</span>';
  }) + '</details>';
}

function renderDyeingForm(item) {
  const colourGroupItems = getItems(item.pi_id).filter(function(i) {
    return normalizeKey(i.colour) === normalizeKey(item.colour);
  });
  
  const processes = rows('Masters_DyeingProcesses').map(function (process) {
    return '<option value="' + escapeAttr(process.process_name) + '">' + escapeHtml(process.process_name) + '</option>';
  }).join('');
  const dyeingHouses = rows('Masters_DyeingHouses').map(function (house) {
    return '<option value="' + escapeAttr(house.dyeing_house_name) + '">' + escapeHtml(house.dyeing_house_name) + '</option>';
  }).join('');
  const addons = rows('Masters_Addons').map(function (addon) {
    return addon.addon_name;
  }).join(', ');

  const itemsHtml = colourGroupItems.map(function(cItem, index) {
    const koraLots = getGreigeLotsForGroup(cItem);
    const availableKora = sum(koraLots, 'balance_weight');
    
    return '<div class="item-dyeing-row" style="border-top:1px solid var(--border-color); padding-top:12px; margin-top:12px;">' +
      '<h4>' + escapeHtml(cItem.fabric_name) + ' <span class="muted">(' + formatNumber(cItem.ordered_qty) + ' ' + escapeHtml(cItem.unit || 'Kg') + ')</span></h4>' +
      '<p class="muted" style="margin:0">Available Kora: ' + formatNumber(availableKora) + '</p>' +
      '<input type="hidden" name="pi_item_id_' + index + '" value="' + escapeAttr(cItem.pi_item_id) + '">' +
      '<div class="form-grid compact">' +
        '<label><span>Dyeing Lot No</span><input name="dyeing_lot_no_' + index + '" placeholder="e.g. 1234"></label>' +
        '<label><span>Sent Rolls</span><input name="sent_rolls_' + index + '" type="number" step="1" min="0"></label>' +
        '<label><span>Sent Weight</span><input name="sent_weight_' + index + '" type="number" step="0.01" min="0"></label>' +
        '<label><span>Recvd Rolls</span><input name="received_rolls_' + index + '" type="number" step="1" min="0"></label>' +
        '<label><span>Recvd Weight</span><input name="received_weight_' + index + '" type="number" step="0.01" min="0"></label>' +
        '<label><span>Loss</span><input name="loss_weight_' + index + '" type="number" step="0.01" min="0"></label>' +
      '</div>' +
    '</div>';
  }).join('');

  const allLots = [];
  colourGroupItems.forEach(function(cItem) {
    allLots.push.apply(allLots, getDyeingLots(cItem.pi_item_id));
  });

  return '<form id="dyeingForm" class="stack-form">' +
    '<h3>Assign Dyeing Lot for ' + escapeHtml(item.colour) + '</h3>' +
    '<div class="form-grid">' +
      '<label><span>Dyeing House</span><select name="dyeing_party"><option value="">Select</option>' + dyeingHouses + '</select></label>' +
      '<label><span>Sent Date</span><input name="sent_date" type="date" value="' + todayIso() + '"></label>' +
      '<label><span>Process</span><select name="process_type"><option value="">Select</option>' + processes + '</select></label>' +
      '<label><span>Addons</span><input name="addons" placeholder="' + escapeAttr(addons || 'Silicon') + '"></label>' +
    '</div>' +
    itemsHtml +
    '<button class="primary-button" style="margin-top:16px" type="submit">Assign Dyeing Lots</button>' +
  '</form>' +
  renderMiniList('Assigned Dyeing Lots', allLots, function (lot) {
    return '<strong>Lot: ' + escapeHtml(lot.dyeing_lot_no || '-') + ' (' + escapeHtml(lot.dyeing_party || '-') + ')</strong><span>' +
      formatNumber(lot.received_weight) + ' kg received</span>';
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
  var form = event.currentTarget;
  var selectedItem = rows('PI_Items').find(function (i) { return i.pi_item_id === state.selectedItemId; });
  if (!selectedItem) return;
  var groupItems = getFabricGroupItems(selectedItem);
  var itemIds = groupItems.map(function (i) { return i.pi_item_id; });
  var yarns = [0, 1, 2].map(function (index) {
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

  await submitAction('saveGroupYarns', { pi_item_ids: itemIds, yarns: yarns });
}

async function handleGreigeSubmit(event) {
  event.preventDefault();
  const payload = objectFromForm(event.currentTarget);
  payload.pi_item_id = state.selectedItemId;
  payload.unit = 'Kg'; // Default for Kora
  await submitAction('addGreigeLot', payload, function () {
    event.currentTarget.reset();
  });
}

async function handleDyeingSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const sharedPayload = objectFromForm(form);
  
  const lots = [];
  let index = 0;
  while (form.elements['pi_item_id_' + index]) {
    const sentQty = form.elements['sent_weight_' + index].value;
    const receivedQty = form.elements['received_weight_' + index].value;
    const lotNo = form.elements['dyeing_lot_no_' + index].value.trim();
    
    if (lotNo || sentQty || receivedQty) {
      lots.push({
        pi_item_id: form.elements['pi_item_id_' + index].value,
        dyeing_lot_no: lotNo,
        sent_rolls: form.elements['sent_rolls_' + index].value,
        sent_weight: sentQty,
        received_rolls: form.elements['received_rolls_' + index].value,
        received_weight: receivedQty,
        loss_weight: form.elements['loss_weight_' + index].value,
        dyeing_party: sharedPayload.dyeing_party,
        sent_date: sharedPayload.sent_date,
        process_type: sharedPayload.process_type,
        received_date: sharedPayload.received_date,
        addons: sharedPayload.addons,
        remarks: sharedPayload.remarks
      });
    }
    index++;
  }

  if (lots.length === 0) {
    showToast('Please enter details for at least one item.');
    return;
  }

  await submitAction('addDyeingLotsBatch', { lots: lots }, function () {
    form.reset();
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
  const colours = {};
  rows('PI_Items').forEach(function(item) {
    if (item.colour) colours[item.colour] = true;
  });
  document.getElementById('colourList').innerHTML = Object.keys(colours).sort().map(function (colour) {
    return '<option value="' + escapeAttr(colour) + '">';
  }).join('');
  
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

function metricCardEx(label, value, sub, tone) {
  return '<article class="metric-card' + (tone ? ' tone-' + tone : '') + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><span class="metric-sub">' + escapeHtml(sub) + '</span></article>';
}

function pctOf(part, total) {
  var t = number(total);
  return t > 0 ? Math.round((number(part) / t) * 100) : 0;
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

function getFabricGroupItems(item) {
  return rows('PI_Items').filter(function (record) {
    return isSameFabricGroup(record, item);
  });
}

function getGroupYarns(groupItems) {
  for (var i = 0; i < groupItems.length; i++) {
    var yarns = getYarns(groupItems[i].pi_item_id);
    if (yarns.length > 0) return yarns;
  }
  return [];
}

function getGreigeLotsForGroup(item) {
  return rows('Greige_Lots').filter(function (record) {
    return isSameFabricGroup(record, item);
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

function normalizeKey(value) {
  return String(value === undefined || value === null ? '' : value).trim().toUpperCase();
}

function isSameFabricGroup(record, group) {
  // Global pooling: match by fabric properties only.


  if (normalizeKey(record.fabric_name) !== normalizeKey(group.fabric_name)) {
    return false;
  }

  if (group.gsm && record.gsm && normalizeKey(record.gsm) !== normalizeKey(group.gsm)) {
    return false;
  }

  if (group.width && record.width && normalizeKey(record.width) !== normalizeKey(group.width)) {
    return false;
  }

  return true;
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
