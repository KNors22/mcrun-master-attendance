// SEMESTER ATTENDANCE SHEET
const ATTENDANCE_IMPORT_ID = '82376152';
const SEMESTER_ATTENDANCE_URL = 'https://docs.google.com/spreadsheets/d/1SnaD9UO4idXXb07X8EakiItOOORw5UuEOg0dX_an3T4/';


function onChange(e) {
  const thisSource = e.source;
  const thisChange = e.changeType;
  
  if (thisChange !== 'EDIT') {
    console.log(`
      Early exit due to invalid e.changeType
      Expected: EDIT \tReceived: ${thisChange}`
    );

    return;
  }

  console.log('thisChange\n\n', thisChange);
  console.log('e.user\n\n', e.user);
  console.log('e.source.getName()\n\n', e.source.getName());

  try {
    const thisSheetID = thisSource.getSheetId();

    // Verify if thisSource valid
    if (!thisSource) {
      console.log(`thisSource is not defined.`);
      console.log(`e.source: ${e.source} - e.changeType: ${e.changeType}`);
      return;
    }

    // Exit early if the event is not related to the import sheet
    if (thisSheetID != MASTER_ATTENDANCE_SHEET_ID) {
      console.log(`
        Early exit. Either e.changeType or source.sheetId() not as expected.
        thisSheetID: ${thisSheetID} \tExpected: ${MASTER_ATTENDANCE_SHEET_ID}`
      );

      return;
    }

    // Trigger formatting and transfer functions if new submission
    console.log('Now triggering maintenance functions.');

    transferToSemesterSheet();
    formatAllNamesInRow();
    prettifySheet();

    console.log('Completed execution of maintenance functions.')
  }
  catch(error) {
    console.log(error);
    console.log(`Type of change: ${thisChange}`);
    
    if (!(error.message).includes('Please select an active sheet first.')) {
      throw new Error(error);
    }

    console.log(error.message);
  }
}


/**
 * Transfers attendance submission to semester attendance sheet.
 * 
 * Exports using `openByUrl` and creating JSON object.
 * 
 * @trigger New app submission.
 * 
 * @param {integer} [row=getLastSubmission_()] row  Row index in GSheet.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Feb 8, 2025
 * @update  Feb 16, 2025
 */

function transferToSemesterSheet(row=getLastSubmission_()) {
  const sheet = MASTER_ATTENDANCE_SHEET;
  const sourceRow = row;
  const sourceColSize = sheet.getLastColumn();

  const rangeSource = sheet.getRange(sourceRow, 1, 1, sourceColSize);
  const values = rangeSource.getDisplayValues()[0];  // Get submission row

  // Prepare registration data to export
  const exportJSON = prepareAttendanceSubmission(values);

  // Current Attendance GSheet
  const sheetURL = SEMESTER_ATTENDANCE_URL;
  const ss = SpreadsheetApp.openByUrl(sheetURL);
  const importSheet = ss.getSheetById(ATTENDANCE_IMPORT_ID);
   
  // Export registration to `Import` sheet
  importSheet.appendRow([exportJSON]);
  
  const rangeIsExported = sheet.getRange(sourceRow, COLUMN_MAP.IS_EXPORTED);
  rangeIsExported.setValue(true);

  console.log(`Successfully exported values to row ${importSheet.getLastRow()} in importSheet!`);

  /**
   * Once exported, `importSheet` does not process the submission until it checks for missing attendance.
   * The triggers for checking attendance are time-based.
   * 
   * Previous attempt to trigger `onChange(e)` for `importSheet` did not work.
   * This is due to GAS restrictions. See page below for more information.
   * 
   * https://developers.google.com/apps-script/guides/triggers/installable#google_apps_triggers
   * 
   * These are the functions that were used to try and externally trigger `onChange(e)`:
   * 
   * sheet.setValues
   * sheet.appendRow
   * sheet.activate
   * sheet.insertRowAfter
   * sheet.hideRow + sheet.unhideRow
   * sheet.hideRows + sheet.showRows
   * sheet.deleteRow
   * ss.setActiveRange
   * ss.insertSheet + ss.deleteSheet
   * 
   */
}



/**
 * Prepare the attendance values into JSON object.
 * 
 * @param {string[]} values  Run attendance information.
 * 
 * @return {string}  JSON-formatted string.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Feb 8, 2025
 * @update  Feb 16, 2025
 */

function prepareAttendanceSubmission(values) {

  /** -> CURRENT SEMESTER ATTENDANCE INDICES (1-indexed) <-
   * 
   * 1: Timestamp
   * 2: Headrunner Email Address
   * 3: Headrunner Name(s)
   * 4: Headrun
   * 5: Run Level
   * 6: Beginner Attendees
   * 7: Intermediate Attendees
   * 8: Advanced Attendees
   * 9: Validation
   * 10: Distance
   * 11: Comments
   * 12: Copy Sent
   * 13: Submission Platform
   * 14: Not Found (Names)
   */

  // Return value from rawData using `index` and substitute newline with semi-colon.
  // JSON does not accept multi-line values.
  const get = (index => String(values[index - 1]).replace(/\n/g, ';'));

  const timestamp = new Date(`${get(COLUMN_MAP.TIMESTAMP)}`);

  const formattedTimestamp = Utilities.formatDate(
    timestamp,
    TIMEZONE,
    "yyyy-MM-dd HH:mm:ss"
  );
  
  // Initial Mapping
  const exportObj = {
    'timestamp' : formattedTimestamp,
    'headrunners' : get(COLUMN_MAP.HEADRUNNERS),
    'headRun' : get(COLUMN_MAP.HEADRUN),
    'runLevel' : get(COLUMN_MAP.RUN_LEVEL),
    'attendees' : get(COLUMN_MAP.ATTENDEES),
    'confirmation' : get(COLUMN_MAP.CONFIRMATION),
    'distance' : get(COLUMN_MAP.DISTANCE),
    'comments' : get(COLUMN_MAP.COMMENTS),
    'platform' : 'McRUN App',
  }

  return JSON.stringify(exportObj);
}

