# PMS Production Management System

PMS is a lightweight PWA for tracking PI orders, PI items, yarn planning, greige production and dyeing. It is designed to use Google Sheets as the backend, Apps Script as the Sheet API, and Cloudflare Pages as the hosted app.

## Project Files

- `index.html` - PWA shell and screens.
- `assets/styles.css` - responsive light UI.
- `assets/app.js` - frontend logic and Sheet sync calls.
- `manifest.webmanifest` - installable PWA config.
- `sw.js` - offline app shell cache.
- `functions/api/pms.js` - Cloudflare Pages Function proxy to Apps Script.
- `Code.gs` - Google Apps Script backend for creating tabs and handling API actions.

## Google Sheet Setup

1. Create a new Google Sheet named `PMS`.
2. Open `Extensions > Apps Script`.
3. Replace the default code with the contents of `Code.gs`.
4. Save the Apps Script project.
5. Reload the Google Sheet.
6. Open `PMS > Setup PMS Sheet`.
7. Open `PMS > Set API Token`.
8. Enter a private token, for example a long password-like value. Keep it for Cloudflare.

The script creates these tabs automatically:

- `PIs`
- `PI_Items`
- `Item_Yarns`
- `Greige_Lots`
- `Dyeing_Lots`
- `Sales_PI_Import`
- `Greige_Lot_Import`
- `Dyeing_Lot_Import`
- `Masters_Customers`
- `Masters_Fabrics`
- `Masters_Yarns`
- `Masters_Machines`
- `Masters_JobWorkers`
- `Masters_DyeingProcesses`
- `Masters_Addons`

## Import Sales PIs

Sales managers can continue building PIs in their own Sheets. PMS imports those rows through the `Sales_PI_Import` tab.

Use these source columns in `Sales_PI_Import`:

| Column | Required | Notes |
|---|---|---|
| `source_key` | No | Stable unique ID from the sales sheet, if available. Recommended. |
| `pi_no` | Yes | Repeat the same PI number for multiple items. |
| `line_no` | No | Item line number inside the PI. Recommended. |
| `customer_name` | Yes | Customer name. |
| `sales_manager` | No | Sales person/manager. |
| `pi_date` | No | PI date. |
| `delivery_date` | No | Delivery date. |
| `priority` | No | `Normal` or `Urgent`. |
| `fabric_name` | Yes | Fabric/item name. |
| `colour` | Yes | Required final colour. |
| `ordered_qty` | Yes | Order quantity. |
| `unit` | No | Defaults to `Kg`. |
| `gsm` | No | GSM. |
| `width` | No | Width or dia. |
| `remarks` | No | Notes. |

PMS writes import results into these columns:

- `import_status`
- `imported_pi_id`
- `imported_item_id`
- `imported_at`
- `import_message`

To import:

1. Put or formula-link sales data into `Sales_PI_Import`.
2. Keep the sales/formula columns from `source_key` to `remarks`.
3. Leave the PMS result columns for PMS to write.
4. In the Sheet menu, click `PMS > Import Sales PIs`.

For a PI with multiple items, repeat the same `pi_no` on multiple rows. PMS will create one PI and multiple `PI_Items`.

## Experimental Greige Lot Workflow

This test version treats greige receipt as its own lot stage.

Flow:

1. PI items are still imported or created colour-wise.
2. Greige fabric received from machines or job workers is entered fabric-wise, not colour-wise.
3. The greige group is `PI + fabric + GSM + width`.
4. Each greige receipt gets a `greige_lot_no`.
5. Colour-wise tracking starts when a greige lot is sent to dyeing.
6. Dyeing sent and received are tracked in both rolls and weight.

`Greige_Lots` important columns:

| Column | Meaning |
|---|---|
| `greige_lot_no` | Lot number assigned when greige is received. |
| `pi_id` | Linked PMS PI. |
| `pi_no` | PI number. |
| `fabric_name` | Fabric group, for example `SPUN FLEECE`. |
| `gsm` | Fabric GSM, used to avoid mixing different qualities. |
| `width` | Width/dia, used to avoid mixing different qualities. |
| `received_date` | Date greige was received. |
| `source_type` | `In-house` or `Job worker`. |
| `machine_no` | Machine number, if in-house. |
| `job_worker_name` | Job worker, if outside. |
| `rolls` | Received rolls. |
| `weight_qty` | Received greige weight. |
| `balance_weight` | Greige balance after dyeing sends. |

`Dyeing_Lots` important columns:

| Column | Meaning |
|---|---|
| `greige_lot_no` | Greige lot sent to dyeing. |
| `dyeing_party` | Dyeing house. |
| `sent_date` | Date sent. |
| `sent_rolls` | Greige rolls sent. |
| `sent_weight` | Greige weight sent. |
| `colour` | Dyed colour. |
| `received_date` | Date received back. |
| `received_rolls` | Dyed rolls received. |
| `received_weight` | Dyed weight received. |
| `loss_weight` | Auto/manual loss weight. |

## Import Greige And Dyeing Lots

For copy-paste import of greige receipts, use `Greige_Lot_Import`.

Fill:

`source_key`, `greige_lot_no`, `pi_no`, `fabric_name`, `gsm`, `width`, `received_date`, `source_type`, `machine_no`, `job_worker_name`, `rolls`, `weight_qty`, `unit`, `remarks`

Then run:

`PMS > Import Greige Lots`

For copy-paste import of dyeing, use `Dyeing_Lot_Import`.

Fill:

`source_key`, `greige_lot_no`, `pi_no`, `line_no`, `fabric_name`, `colour`, `dyeing_party`, `sent_date`, `sent_rolls`, `sent_weight`, `process_type`, `addons`, `received_date`, `received_rolls`, `received_weight`, `remarks`

Then run:

`PMS > Import Dyeing Lots`

## Apps Script Web App Deploy

1. In Apps Script, click `Deploy > New deployment`.
2. Select type `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Click `Deploy`.
6. Authorize access when Google asks.
7. Copy the web app URL ending with `/exec`.

## Cloudflare Pages Setup

1. Put this project in a GitHub repository.
2. In Cloudflare, open `Workers & Pages`.
3. Choose `Create application > Pages > Import an existing Git repository`.
4. Select the PMS repository.
5. Use these build settings:
   - Framework preset: `None`
   - Build command: `exit 0`
   - Build output directory: `/`
6. Add environment variables:
   - `APPS_SCRIPT_URL` = your Apps Script `/exec` URL
   - `PMS_API_TOKEN` = the same token you saved in Google Sheets
7. Deploy.

## Local Preview

You can preview the static UI locally:

```powershell
node tools/dev-server.mjs
```

Then open:

```text
http://localhost:4173
```

The local static preview will show the UI, but Sheet sync needs Cloudflare Pages Functions or a compatible local Pages runtime.

## Main Workflow

1. Create a PI with multiple items.
2. Open the PI in Orders.
3. Select each item.
4. Save yarn blends, up to three yarns.
5. Add greige lots from machine or job worker.
6. Add dyeing sent/received lots by greige lot number.
7. PMS updates item balances and PI status automatically.
