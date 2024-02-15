const initMondayClient = require('monday-sdk-js');

const getAllRows = async (token, boardId) =>{
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query {
      boards(ids:${boardId}) {
        items {
          id
          name
          column_values {
            title
            text
            id
          }
        }
      }
    }
    `;

    const variables = { boardId};

    const response = await mondayClient.api(query, { variables });
    return response.data.boards[0].items; 
  } catch (err) {
    console.error(err);
  }
}

const getColumnValue = async (token, itemId, columnId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query {
        items (ids: ${itemId}) {
          name
          column_values(ids:"${columnId}") {
            text
          }
        }
      }`;

    const variables = { itemId, columnId};


    const response = await mondayClient.api(query, { variables });
    console.log(query);
    console.log(response);
    return response.data.items[0].column_values[0].text; 
  } catch (err) {
    console.error(err);
  }
};


const getRowName = async (token, itemId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query {
        items (ids: ${itemId}) {
          name
        }
      }`;

    const variables = {itemId };

    const response = await mondayClient.api(query, { variables });
    return response.data.items[0].name; 
  } catch (err) {
    console.error(err);
  }
};

const fetchValuesOfBoard = async (token, itemId, columnId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query {
        items (ids: ${itemId}) {
          column_values(ids:"${columnId}") {
            text
          }
        }
      }`;

    const variables = { columnId, itemId };

    const response = await mondayClient.api(query, { variables });
    return response; 
  } catch (err) {
    console.error(err);
  }
};


const getTableSchema = async (token, boardID) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query {
                        boards (ids:${boardID}) {
                            id
                            columns {
                                id
                                type
                                title
                                settings_str
                            }
                        }
                    }`;

    const variables = { boardID };

    const response = await mondayClient.api(query, { variables });
    console.log(response)
    return response; 
  } catch (err) {
    console.error(err);
  }
};


const changeColumnValue = async (token, boardId, itemId, columnId, value) => {
  try {
    const mondayClient = initMondayClient({ token });

    const query = `mutation change_column_value {
        change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: "${columnId}", value: ${value}) {
          id
        }
      }
      `;
    const variables = { boardId, columnId, itemId, value };
    
    const response = await mondayClient.api(query, { variables });
    console.log("hello");
    console.log(response);
    return response;
  } catch (err) {
    console.error(err);
  }
};

async function updateMondayColumn(token, boardId, itemId, columnIds, newColumnValues) {
  try {
    const mondayClient = initMondayClient({ token });

    var column_values = {};

    for(var idx = 0; idx < newColumnValues.length; idx++){
      column_values[columnIds[idx]] =  newColumnValues[idx]
    }
    
    // Construct the update query
    const updateQuery = `mutation {
                                change_multiple_column_values (
                                  board_id: ${boardId},
                                  item_id: ${itemId},
                                  column_values: ${JSON.stringify(JSON.stringify(column_values))}
                                ) {
                                  id
                                }
                              }`;

    // column_id: "${columnId}",
    // Execute the update query
    console.log(updateQuery);
    const response = await mondayClient.api(updateQuery);
    console.log(response)
    console.log(`Column value updated successfully for item ${itemId}`);
  } catch (error) {
      console.error('Error updating column value:', error);
  }
};


async function createOrUpdateSubitem(token, itemId, rowName, newColumnValues) {
    try {
      const mondayClient = initMondayClient();
      mondayClient.setToken(token);
  
      const query = `mutation { 
                        create_subitem (
                          parent_item_id: ${itemId} ,
                          item_name: ${JSON.stringify(rowName)}, 
                          column_values:${JSON.stringify(JSON.stringify(newColumnValues))})
                          {
                            id
                          }
                      }`;
      
      console.log(query);
      
      const response = await mondayClient.api(query);
      console.log(response);
      return response; 
    } catch (err) {
      console.error(err);
    }
};

module.exports = {
  getColumnValue,
  changeColumnValue,
  updateMondayColumn,
  fetchValuesOfBoard,
  getTableSchema,
  createOrUpdateSubitem,
  getRowName,
  getAllRows
};