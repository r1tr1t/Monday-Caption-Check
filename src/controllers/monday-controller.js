const mondayService = require('../services/monday-service');
const transformationService = require('../services/transformation-service');
const { TRANSFORMATION_TYPES } = require('../constants/transformation');
const captionServices = require('./check-captions');

let subitemParams = {};

const shortLivedToken  = process.env.MONDAY_API_KEY;

async function updateMondayDataTemp(videoId, ...args){
    try {
        const channelName = await captionServices.getYouTubeChannelName(videoId);
        const [captionStatus, captionType] = await captionServices.getYoutubeCaptionDetails(videoId);
        const youTubeVideoStatus = await captionServices.getYouTubeVideoStatus(videoId);
        // const captionStatus = await captionServices.checkYoutubeCaptionedOrNot(videoId);
        await mondayService.updateMondayColumn(...args, [captionStatus ? "True":"False", channelName, captionType, youTubeVideoStatus]);
    }
    catch(err){
      console.log(err)
    }
}

async function getYouTubeChannelDetails(req, res) {  
    try {
      const { payload } = req.body;
      const { inputFields } = payload;
      const { boardId, itemId, columnId, sourceColumnId, captionTypeColumnId, channelNameColumnId, captionStatusColumnId, youtubeStatusColumnId} = inputFields;
  
      const videoId = await mondayService.getColumnValue(shortLivedToken, itemId, sourceColumnId);
      const checkStatus = await mondayService.getColumnValue(shortLivedToken, itemId, columnId);


      if(checkStatus === "Get Details"){
        const channelName = await captionServices.getYouTubeChannelName(videoId);
        const [captionStatus, captionType] = await captionServices.getYoutubeCaptionDetails(videoId);
        const youTubeVideoStatus = await captionServices.getYouTubeVideoStatus(videoId);
        // const captionStatus = await captionServices.checkYoutubeCaptionedOrNot(videoId);

        await mondayService.updateMondayColumn(shortLivedToken, boardId, itemId, [captionStatusColumnId, channelNameColumnId, captionTypeColumnId, youtubeStatusColumnId], [captionStatus ? "True":"False", channelName, captionType, youTubeVideoStatus]);  
      }
      else if(checkStatus === "Get All Details"){
        var boardRows = await mondayService.getAllRows(shortLivedToken, boardId);
        const index = boardRows.findIndex(row => row.id == itemId);
        
        for(var idx = index; idx < ((index + 100) > boardRows.length ? index + (boardRows.length - index) : index + 100); idx++){
            const videoId = boardRows[idx].column_values.find(item => item.id === sourceColumnId).text;
            const itemId = boardRows[idx].id;
            updateMondayDataTemp(videoId, shortLivedToken, boardId, itemId, [captionStatusColumnId, channelNameColumnId, captionTypeColumnId, youtubeStatusColumnId]);
        }
      }
  
      return res.status(200).send({});
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: 'internal server error' });
    }
}


async function executeAction(req, res) {
    try {
        const { payload } = req.body;
        const { inputFields } = payload;
        const { boardId, itemId, sourceColumnId, targetColumnId, transformationType } = inputFields;

        const categoryId = await mondayService.getColumnValue(shortLivedToken, itemId, sourceColumnId);
        const entryId = await mondayService.getRowName(shortLivedToken, itemId);

        if(categoryId !== null){
            const response = await captionServices.addCategories(entryId, categoryId);
        }

        return res.status(200).send({});
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: 'internal server error' });
    }
}


async function checkCaption(req, res) {
    try {
        const { payload } = req.body;
        const { inputFields } = payload;
        const { boardId, columnId, itemId, sourceColumnId } = inputFields;

        const status = await mondayService.getColumnValue(shortLivedToken, itemId, sourceColumnId);

        if(status === "Begin Check"){
            res.send(getMethodHandler(inputFields));
        }
        else{
            res.json({
                'statusCode': 200,
                'body': JSON.stringify("Updated the board successfully")
            })
        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'internal server error' });
    }
}


async function getBoardData(req, method) {
    try {
        const { boardId, columnId, itemId, sourceColumnId } = req;

        var linkId = "";

        if (method !== "categories") {
            await mondayService.updateMondayColumn(shortLivedToken, boardId, itemId, [sourceColumnId], ["Check in Progress"]);
        }


        const schemaResponse =  await mondayService.getTableSchema(shortLivedToken, boardId);
        const tableSchema = schemaResponse.data.boards[0].columns;

        if (method !== "categories") {
            for (const schema of tableSchema) {
                switch (schema.title) {
                    case "Link":
                        linkId = schema.id;
                        break;
                    case "Kaltura":
                        kalturaId = schema.id;
                        break;
                    case "Captioned?":
                        subitemParams.captioned = schema.id;
                        break;
                    case "Caption Type":
                        subitemParams.caption_type = schema.id;
                        break;
                    case "Subitems":
                        const temp = JSON.parse(schema.settings_str);
                        const subitemBoardId = temp.boardIds[0];
                        const subitemSchemaResponse = await mondayService.getTableSchema(shortLivedToken, subitemBoardId);
                        const subitemTableSchema = subitemSchemaResponse.data.boards[0].columns;

                        for (const subitem_column of subitemTableSchema) {
                            switch (subitem_column.title) {
                                case "Page Name":
                                    subitemParams.page_name = subitem_column.id;
                                    break;
                                case "Link to Page":
                                    subitemParams.link_to_page = subitem_column.id;
                                    break;
                                case "Video Type":
                                    subitemParams.video_type = subitem_column.id;
                                    break;
                                case "Published":
                                    subitemParams.published = subitem_column.id;
                                    break;
                                case "Captioned?":
                                    subitemParams.captioned = subitem_column.id;
                                    break;
                                case "Caption Type":
                                    subitemParams.caption_type = subitem_column.id;
                                    break;
                                case "3Play":
                                    subitemParams["3play"] = subitem_column.id;
                                    break;
                                case "Duration":
                                    subitemParams.duration = subitem_column.id;
                                    break;
                            }
                        }
                        break;
                }
            }
        } else {
            for (const subitem_column of tableSchema) {
                switch (subitem_column.title) {
                    case "Page Name":
                        subitemParams.page_name = subitem_column.id;
                        break;
                    case "Link to Page":
                        subitemParams.link_to_page = subitem_column.id;
                        break;
                    case "Video Type":
                        subitemParams.video_type = subitem_column.id;
                        break;
                    case "Published":
                        subitemParams.published = subitem_column.id;
                        break;
                    case "Captioned?":
                        subitemParams.captioned = subitem_column.id;
                        break;
                    case "Caption Type":
                        subitemParams.caption_type = subitem_column.id;
                        break;
                    case "3Play":
                        subitemParams["3play"] = subitem_column.id;
                        break;
                }
            }
        }

        if (method === "captions") {
            return await mondayService.fetchValuesOfBoard(shortLivedToken, itemId, linkId);
        } else if (method === "categories") {
            return await mondayService.fetchValuesOfBoard(shortLivedToken, itemId, subitemParams["3play"] || "null");
        } else if (method === "getCaption") {
            return await mondayService.fetchValuesOfBoard(shortLivedToken, itemId, columnId);
        } else if (method === "getCaptionAll") {
            return await mondayService.fetchValuesOfBoard(shortLivedToken, itemId, columnId);
        }
    }
    catch(err){
      console.log(err)
    }
}


async function getMethodHandler(req) {
    try {
        console.log("fetching the data");

        const { boardId, columnId, itemId, sourceColumnId } = req;

        const response = await getBoardData(req, "captions", shortLivedToken);
        const course_link = response.data.items[0].column_values[0].text
        let course_number = 0;

        const pattern = /\/courses\/(\d+)/;

        // Use the regular expression to find matches in the link
        const matches = course_link.match(pattern);

        if (matches) {
            // The first match group contains the course number
            course_number = matches[1];
        }

        const result = await captionServices.getCaptionedVideos(course_number);

        let total_kaltura_videos = 0;

        for (const [key, value] of Object.entries(result[0])) {
            total_kaltura_videos += Object.entries(value.entry_id).length;
        }

        for (const [key, value] of Object.entries(result[1])) {
            total_kaltura_videos += Object.entries(value.entry_id).length;
        }

        for (const [key, value] of Object.entries(result[2])) {
            total_kaltura_videos += Object.entries(value.entry_id).length;
        }

        for (const [key, value] of Object.entries(result[3])) {
            total_kaltura_videos += Object.entries(value.entry_id).length;
        }

        await mondayService.changeColumnValue(shortLivedToken, boardId, itemId, columnId, total_kaltura_videos.toString());

        for (const [key, value] of Object.entries(result[0])) {
            for (const [entry_ids, details] of Object.entries(value.entry_id)) {
                const sub_item_column_value = {
                    [subitemParams.page_name]: key,
                    [subitemParams.link_to_page]: {
                        "url": value.url,
                        "text": value.url
                    },
                    [subitemParams.captioned]: details[0] ? "True" : "False",
                    [subitemParams.published]: value.published ? "True" : "False",
                    [subitemParams.video_type]: details[1],
                    [subitemParams.caption_type]: details[2],
                    [subitemParams.caption_type]: details[2],
                    [subitemParams.duration]: details[3]
                };

                await mondayService.createOrUpdateSubitem(shortLivedToken, itemId, entry_ids, sub_item_column_value);
            }
        }

        for (const [key, value] of Object.entries(result[1])) {
            for (const [entry_ids, details] of Object.entries(value.entry_id)) {
                const sub_item_column_value = {
                    [subitemParams.page_name]: key,
                    [subitemParams.link_to_page]: {
                        "url": value.url,
                        "text": value.url
                    },
                    [subitemParams.captioned]: details[0] ? "True" : "False",
                    [subitemParams.published]: value.published ? "True" : "False",
                    [subitemParams.video_type]: details[1],
                    [subitemParams.caption_type]: details[2],
                    [subitemParams.duration]: details[3]
                };

                await mondayService.createOrUpdateSubitem(shortLivedToken, itemId, entry_ids, sub_item_column_value);
            }
        }

        for (const [key, value] of Object.entries(result[2])) {
            for (const [entry_ids, details] of Object.entries(value.entry_id)) {
                const sub_item_column_value = {
                    [subitemParams.page_name]: key,
                    [subitemParams.link_to_page]: {
                        "url": value.url,
                        "text": value.url
                    },
                    [subitemParams.captioned]: details[0] ? "True" : "False",
                    [subitemParams.published]: value.published ? "True" : "False",
                    [subitemParams.video_type]: details[1],
                    [subitemParams.caption_type]: details[2],
                    [subitemParams.duration]: details[3]
                };

                await mondayService.createOrUpdateSubitem(shortLivedToken, itemId, entry_ids, sub_item_column_value);
            }
        }

        for (const [key, value] of Object.entries(result[3])) {
            for (const [entry_ids, details] of Object.entries(value.entry_id)) {
                const sub_item_column_value = {
                    [subitemParams.page_name]: key,
                    [subitemParams.link_to_page]: {
                        "url": value.url,
                        "text": value.url
                    },
                    [subitemParams.captioned]: details[0] ? "True" : "False",
                    [subitemParams.published]: value.published ? "True" : "False",
                    [subitemParams.video_type]: details[1],
                    [subitemParams.caption_type]: details[2],
                    [subitemParams.duration]: details[3]
                };

                await mondayService.createOrUpdateSubitem(shortLivedToken, itemId, entry_ids, sub_item_column_value);
            }
        }

        await mondayService.updateMondayColumn(shortLivedToken, boardId, itemId, [sourceColumnId], ["Check Complete"]);


        return {
            'statusCode': 200,
            'body': JSON.stringify("Updated the board successfully")
        };
    }
    catch(err){
      console.log(err)
    }
}


async function getRemoteListOptions(req, res) {
    try {
        return res.status(200).send(TRANSFORMATION_TYPES);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: 'internal server error' });
    }
}

module.exports = {
  executeAction,
  getRemoteListOptions,
  checkCaption,
  getYouTubeChannelDetails
};