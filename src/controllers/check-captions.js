const axios = require('axios');
const { unescape } = require('querystring');
const { google } = require('googleapis');

var base_url = process.env.BASE_URL;
var accessToken = process.env.CANVAS_ACCESS_TOKEN;
var youtubeAPIKey = process.env.YOUTUBE_API_KEY;
var kalturaAPIKey = process.env.KALTURA_API_KEY;
var apiKeys = process.env.YOUTUBE_API_KEYS.split(',');
console.log(apiKeys);

function convertSecondstoTime(seconds){
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  var remainingSeconds = seconds % 60;

  // Add leading zero if single digit
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  remainingSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;

  return hours + ':' + minutes + ':' + remainingSeconds;
}

function getNextPageUrl(linkHeader) {
  try {
    console.log("---- changing to next page ----")
    const links = linkHeader.split(', ');
    for (const link of links) {
        const [url, rel] = link.split('; ');
        if (rel.includes('next')) {
            return url.slice(1, -1); // Remove angle brackets around URL
        }
    }
    return null; // No next page link
  }
  catch(err){
    console.log(err)
  }
}

async function addCategories(entryId, categoryId) {
  try {
    const secretsParams = {
      secret: kalturaAPIKey,
      partnerId: 1530551,
      privileges: "",
      type: 2,
      userId: 'captions@usu.edu',
      format: 1,
    };
  
    const startSessionUrl = 'https://www.kaltura.com/api_v3/service/session/action/start';
    console.log("---- Started adding categories to kaltura videos in management console ----")
    const startSessionResponse = await axios.get(startSessionUrl, { params: secretsParams });
    console.log(startSessionResponse)
    const ks = startSessionResponse.data;
  
    const categoriesMap = {
      '3play': 184368213,
      '3play_extended': 184764723,
      '3play_rush': 289696852,
      '3play_same_day': 289694022,
      '3play_two_hour': 289697052,
      '3play_expedited': 289696942,
    };
  
    const addCategoryParams = {
      ks: ks,
      format: 1,
      categoryEntry: {
        categoryId: categoriesMap[categoryId],
        entryId: entryId,
      },
    };
  
    const addCategoryUrl = 'https://www.kaltura.com/api_v3/service/categoryentry/action/add';
    const addCategoryResponse = await axios.post(addCategoryUrl, addCategoryParams);
    console.log("---- Finished adding categories to kaltura videos in management console ----")
    const responseData = addCategoryResponse.data;
  
    // Handle the response as needed
    console.log(responseData);
    return responseData;
  }
  catch(err){
    console.log(err)
  }
}


async function extractSrcLinks(htmlString) {
  try {
    const pattern = /src=["'](.*?)["']/g;  // Regex pattern to match src links
    const srcLinks = [];
    let match;
  
    while ((match = pattern.exec(htmlString)) !== null) {
      srcLinks.push(match[1]);
    }
  
    return srcLinks;
  }
  catch(err){
    console.log(err)
  }
}


async function getKalturaEntryId(html) {
  try {
      // Regular expression pattern to match URLs in 'src' and 'href' attributes
    const urlPattern = /(?:src|href)="(.*?)"/g;

    // Find all matches of URLs using the pattern
    const matches = [...html.matchAll(urlPattern)];

    const entryId = new Set();

    // Print the extracted URLs
    for (const match of matches) {
      const url = unescape(match[1]);

      // Regex pattern to match entry IDs in the first form (entryid/0_d09etxu6)
      const pattern1 = /\/entryid\/([^/?&]+)/;

      // Regex pattern to match entry IDs in the second form (entry_id=0_d09etxu6)
      const pattern2 = /entry_id=([^"&]+)/;

      const playlistPattern = /\[playlistAPI\.kpl0Id\]=(\d+_[^&"]+)/;

      const playlistIdPattern = /playlist_id=([^&]+)/;

      const entryIds = [];

      const matches1 = url.match(pattern1);
      const matches2 = url.match(pattern2);
      const playlistMatches = url.match(playlistPattern);
      const playlistIdMatches = url.match(playlistIdPattern);

      if (matches1) {
        if (url.includes("Playlist")) {
          let playlist = await getKalturaPlaylistVideos(matches1[1]);
          console.log("check playlist");
          for(var idx = 0; idx < playlist.length;idx++){
            entryIds.push(playlist[idx]); 
          }
          console.log(entryIds);
        }
        else{
          entryIds.push(matches1[1]);
        }
      }

      if (matches2) {
        if (url.includes("Playlist")) {
          let playlist = await getKalturaPlaylistVideos(matches2[1]);
          console.log("check playlist");

          for(var idx = 0; idx < playlist.length;idx++){
            entryIds.push(playlist[idx]); 
          }
          console.log(entryIds);
        }
        else{
          entryIds.push(matches2[1]);
        }
      }

      if(playlistMatches){
        if (url.includes("playlistAPI")) {
          let playlist = await getKalturaPlaylistVideos(playlistMatches[1]);
          console.log("check playlist");

          for(var idx = 0; idx < playlist.length;idx++){
            entryIds.push(playlist[idx]); 
          }
          console.log(entryIds);
        }
      }

      if(playlistIdMatches){
        if (url.includes("playlist_id")) {
          let playlist = await getKalturaPlaylistVideos(playlistIdMatches[1]);
          console.log("check playlist");

          for(var idx = 0; idx < playlist.length;idx++){
            entryIds.push(playlist[idx]); 
          }
          console.log(entryIds);
        }
      }
      
      if(entryIds.length !== 0){
        for(var idx = 0; idx < entryIds.length;idx++){
          entryId.add(entryIds[idx]); 
        }
      }

    }

    return entryId;
  }
  catch(err){
    console.log(err)
  }
}


function getYoutubeEntryId(html) {
  try {
      // Regular expression pattern to match URLs in 'src' and 'href' attributes
    const urlPattern = /(?:src|href)="(.*?)"/g;

    // Find all matches of URLs using the pattern
    const matches = [...html.matchAll(urlPattern)];

    const entryId = new Set();

    // Print the extracted URLs
    for (const match of matches) {
      const url = unescape(match[1]);

      if (!url.includes('youtube')) {
        continue;
      }

      // Regex pattern to match entry IDs in the first form (embed/0_d09etxu6)
      const pattern1 = /\/embed\/([^/?&]+)/;

      // Regex pattern to match entry IDs in the second form (v=0_d09etxu6)
      const pattern2 = /v=([^"&]+)/;

      const entryIds = [];

      const matches1 = url.match(pattern1);
      const matches2 = url.match(pattern2);

      if (matches1) {
        entryIds.push(matches1[1]);
      }

      if (matches2) {
        entryIds.push(matches2[1]);
      }

      entryId.add(...entryIds);
    }

    return entryId;
  }
  catch(err){
    console.log(err)
  }
}


function getVideoEntryId(html) {
  try {
    // Regular expression pattern to match URLs in 'src' and 'href' attributes
    const urlPattern = /(?:src|href)="(.*?)"/g;

    // Find all matches of URLs using the pattern
    const matches = [...html.matchAll(urlPattern)];

    const entryId = new Set();

    // Print the extracted URLs
    for (const match of matches) {
      const url = unescape(match[1]);

      if (!(url.includes('media_objects_iframe') && url.includes('type=video'))) {
        continue;
      }

      // Regex pattern to match entry IDs in the first form (media_objects_iframe/0_d09etxu6)
      const pattern1 = /\/media_objects_iframe\/([^/?&]+)/;

      const matches1 = url.match(pattern1);
      
      if (matches1) {
        const reversedEntryId = matches1[1].split('').reverse().join('');
        entryId.add(reversedEntryId);
      }
    }

    return entryId;
  }
  catch(err){
    console.log(err)
  }
}


function getAudioEntryId(html) {
  try {
    // Regular expression pattern to match URLs in 'src' and 'href' attributes
    const urlPattern = /(?:src|href)="(.*?)"/g;

    // Find all matches of URLs using the pattern
    const matches = [...html.matchAll(urlPattern)];

    const entryId = new Set();

    // Print the extracted URLs
    for (const match of matches) {
      const url = unescape(match[1]);

      if (!(url.includes('media_objects_iframe') && url.includes('type=audio'))) {
        continue;
      }

      // Regex pattern to match entry IDs in the first form (media_objects_iframe/0_d09etxu6)
      const pattern1 = /\/media_objects_iframe\/([^/?&]+)/;

      const matches1 = url.match(pattern1);
      
      if (matches1) {
        const reversedEntryId = matches1[1].split('').reverse().join('');
        entryId.add(reversedEntryId);
      }
    }

    return entryId;
  }
  catch(err){
    console.log(err)
  }
}


async function getAllPages(courseId) {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
  
    const params = {
      per_page: 500, // Number of pages to retrieve per request
    };
  
    const allPages = [];
    let url = `${base_url}/courses/${courseId}/pages`; // Replace <base_url> and <courseId> with the appropriate values
  
    while (url) {
      try {
        console.log("---- Started getting all the pages from canvas ----")
        const response = await axios.get(url, { headers, params });
        const pages = response.data;
        allPages.push(...pages);
  
        // Check if there are more pages
        const linkHeader = response.headers.link;
        if (linkHeader) {
            const nextPageUrl = getNextPageUrl(linkHeader);
            if (nextPageUrl) {
                url = nextPageUrl;
            } else {
                break; // No more pages
            }
        } else {
            break; // No link header, assume no more pages
        }
      } catch (error) {
        console.error(`Error fetching pages: ${error.message}`);
        break;
      }
    }

    console.log("---- Finished getting all the pages from canvas ----")
  
    return allPages;
  }
  catch(err){
    console.log(err)
  }
}


async function getAllDiscussions(courseId) {
  try {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    const params = {
        per_page: 500, // Number of discussions to retrieve per request
    };

    const allDiscussions = [];
    let url = `${base_url}/courses/${courseId}/discussion_topics`; // Replace <base_url> and <courseId> with the appropriate values

    while (url) {
        try {
            console.log("---- Started getting all the discussions from canvas ----")
            const response = await axios.get(url, { headers, params });
            const discussions = response.data;
            allDiscussions.push(...discussions);

            // Check if there are more discussions
            const linkHeader = response.headers.link;
            if (linkHeader) {
                const nextPageUrl = getNextPageUrl(linkHeader);
                if (nextPageUrl) {
                    url = nextPageUrl;
                } else {
                    break; // No more discussions
                }
            } else {
                break; // No link header, assume no more discussions
            }
        } catch (error) {
            console.error(`Error fetching discussions: ${error.message}`);
            break;
        }
    }

    console.log("---- Finished getting all the discussions from canvas ----");

    return allDiscussions;
  }
  catch(err){
    console.log(err)
  }
}

async function getAllAssignments(courseId) {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
  
    const params = {
      per_page: 500, // Number of assignments to retrieve per request
    };
  
    const allAssignments = [];
    let url = `${base_url}/courses/${courseId}/assignments`; // Replace <base_url> and <courseId> with the appropriate values
  
    while (url) {
      try {
        console.log("---- Started getting all the assignments from canvas ----")
        const response = await axios.get(url, { headers, params });
        const assignments = response.data;
        allAssignments.push(...assignments);
  
        // Check if there are more pages
        const linkHeader = response.headers.link;
        if (linkHeader) {
            const nextPageUrl = getNextPageUrl(linkHeader);
            if (nextPageUrl) {
                url = nextPageUrl;
            } else {
                break; // No more pages
            }
        } else {
            break; // No link header, assume no more pages
        }
      } catch (error) {
        console.error(`Error fetching assignments: ${error.message}`);
        break;
      }
    }

    console.log("---- Finished getting all the assignments from canvas ----");
  
    return allAssignments;
  }
  catch(err){
    console.log(err)
  }
}


async function getAllQuizzes(courseId) {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
  
    const params = {
      per_page: 500, // Number of quizzes to retrieve per request
    };
  
    const allQuizzes = [];
    let url = `${base_url}/courses/${courseId}/quizzes`; // Replace <base_url> and <courseId> with the appropriate values
  
    while (url) {
      try {
        console.log("---- Started getting all the quizzes from canvas ----")
        const response = await axios.get(url, { headers, params });
        const quizzes = response.data;
        allQuizzes.push(...quizzes);
  
        // Check if there are more pages
        const linkHeader = response.headers.link;
        if (linkHeader) {
            const nextPageUrl = getNextPageUrl(linkHeader);
            if (nextPageUrl) {
                url = nextPageUrl;
            } else {
                break; // No more pages
            }
        } else {
            break; // No link header, assume no more pages
        }
      } catch (error) {
        console.error(`Error fetching quizzes: ${error.message}`);
        break;
      }
    }

    console.log("---- Finished getting all the quizzes from canvas ----");

    return allQuizzes;
  }
  catch(err){
    console.log(err)
  }
}


async function getUrl(courseId, allPages, tab) {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
  
    const allUrls = {};
  
    for (const page of allPages) {
      let jsonResponse;
  
      if (tab === 'pages') {
        console.log("---- Started getting all the url's from canvas ----")
        const url = `${base_url}/courses/${courseId}/pages/${page.page_id}`;
        const response = await axios.get(url, { headers });
        jsonResponse = response.data;
      } else {
        jsonResponse = page;
      }
  
      let htmlBody, title;
  
      if (tab === 'pages') {
        htmlBody = jsonResponse.body;
        title = jsonResponse.title;
      } else if (tab === 'assignments') {
        htmlBody = jsonResponse.description;
        title = jsonResponse.name;
      } else if (tab === 'discussions') {
        htmlBody = jsonResponse.message;
        title = jsonResponse.title;
      } else if (tab === 'quizzes') {
        htmlBody = jsonResponse.description;
        title = jsonResponse.title;
      }
  
      if (!htmlBody) {
        continue;
      }
  
      const allEntryIds = {};
  
      console.log(page)
      console.log(htmlBody)
  
      const entryIdsKaltura = await getKalturaEntryId(htmlBody);
      console.log(entryIdsKaltura);
      
      if (entryIdsKaltura.size !== 0) {
        allEntryIds['Kaltura'] = Array.from(entryIdsKaltura);
      }
  
      const entryIdsYouTube = getYoutubeEntryId(htmlBody);
      if (entryIdsYouTube.size !== 0) {
        allEntryIds['YouTube'] = Array.from(entryIdsYouTube);
      }
  
      const entryIdsVideo = getVideoEntryId(htmlBody);
      if (entryIdsVideo.size !== 0) {
        allEntryIds['Video'] = Array.from(entryIdsVideo);
      }
  
      const entryIdsAudio = getAudioEntryId(htmlBody);
      if (entryIdsAudio.size !== 0) {
        allEntryIds['Audio'] = Array.from(entryIdsAudio);
      }
  
      if (Object.keys(allEntryIds).length === 0) {
        continue;
      }
  
      allUrls[title] = {
        entry_id: allEntryIds,
        url: jsonResponse.html_url,
        published: jsonResponse.published,
      };
    }
  
    console.log("---- Finished getting all the urls from canvas ----");
  
    return allUrls;
  }
  catch(err){
    console.log(err)
  }
}


async function checkCaptionedOrNot(entryId) {
  try {
    const startSessionParams = {
      secret: kalturaAPIKey,
      partnerId: 1530551,
      privileges: '',
      type: 2,
      userId: 'captions@usu.edu',
      format: 1,
    };
  
    console.log("---- Started checking kaltura video is captioned or not ----");
  
    const startSessionUrl = 'https://www.kaltura.com/api_v3/service/session/action/start';
    const startSessionResponse = await axios.get(startSessionUrl, { params: startSessionParams });
    const ks = startSessionResponse.data;
  
    const listCaptionParams = {
      ks: ks,
      partnerId: 1530551,
      format: 1,
      filter: {
        objectType: 'KalturaAssetFilter',
        entryIdEqual: entryId,
      },
      pager: {
        objectType: 'KalturaPager',
        pageIndex: 0,
        pageSize: 0,
      },
    };
  
    const listCaptionUrl = 'https://www.kaltura.com/api_v3/service/caption_captionasset/action/list';
    const listCaptionResponse = await axios.post(listCaptionUrl, listCaptionParams);
    const totalCount = listCaptionResponse.data.totalCount;
  
    console.log("---- Finished checking kaltura video is captioned or not ----");
  
    return totalCount > 0;
  }
  catch(err){
    console.log(err)
  }
}

async function getKalturaPlaylistVideos(id){
  try {
    console.log(id)
    const startSessionParams = {
      secret: kalturaAPIKey,
      partnerId: 1530551,
      privileges: '',
      type: 2,
      userId: 'captions@usu.edu',
      format: 1,
    };

    console.log("---- Getting playlist videos----");

    const startSessionUrl = 'https://www.kaltura.com/api_v3/service/session/action/start';
    const startSessionResponse = await axios.get(startSessionUrl, { params: startSessionParams });
    const ks = startSessionResponse.data;

    const listCaptionParams = {
      ks: ks,
      partnerId: 1530551,
      format: 1,
      id: id
    };

    const playListUrl = 'https://www.kaltura.com/api_v3/service/playlist/action/get';
    const listCaptionResponse = await axios.post(playListUrl, listCaptionParams);
    console.log(listCaptionResponse.data.playlistContent.split(','));
    return listCaptionResponse.data.playlistContent.split(',');
  }
  catch(err){
    console.log(err)
  }
}

async function getKalturaVideoDuration(id){
  try {
    console.log(id)
    const startSessionParams = {
      secret: kalturaAPIKey,
      partnerId: 1530551,
      privileges: '',
      type: 2,
      userId: 'captions@usu.edu',
      format: 1,
    };

    console.log("---- Getting playlist videos----");

    const startSessionUrl = 'https://www.kaltura.com/api_v3/service/session/action/start';
    const startSessionResponse = await axios.get(startSessionUrl, { params: startSessionParams });
    const ks = startSessionResponse.data;

    const getVideoDuration = {
      ks: ks,
      partnerId: 1530551,
      format: 1,
      entryId: id
    };

    const videoDurationURL = 'https://www.kaltura.com/api_v3/service/media/action/get';
    const videoDurationResponse = await axios.post(videoDurationURL, getVideoDuration);
    return convertSecondstoTime(videoDurationResponse.data.duration);
  }
  catch(err){
    console.log(err)
  }
}



async function checkQuotaExceeded(videoId){
  try {
    console.log("---- Checking the quota of API keys ----");

    for (const apiKey of apiKeys) {
      try {
        var youtube = google.youtube({
          version: 'v3',
          auth: apiKey,
        });
    
        // Get video details
        const videoResponse = await youtube.videos.list({
          part: 'snippet',
          id: videoId,
        });
        
        return apiKey;
      } catch (error) {
        console.log(`API key ${apiKey} has exceeded its quota. Trying the next key.`);
        console.error(`An error occurred with API key ${apiKey}: ${error.message}`);
      }
    }

    console.error("All API keys have exceeded their quota.");
    return null;
  }
  catch(err){
    console.log(err)
  }
}

async function getYouTubeChannelName(videoId) {
  try {

    const youtubeAPIKey = await checkQuotaExceeded(videoId);

    console.log("---- Started getting YouTube channel name ----" + youtubeAPIKey);

    var youtube = google.youtube({
      version: 'v3',
      auth: youtubeAPIKey,
    });

    // Get video details
    const videoResponse = await youtube.videos.list({
      part: 'snippet',
      id: videoId,
    });

    const video = videoResponse.data.items[0];
    
    if (video) {
      // Get channel details using the channelId from the video
      const channelResponse = await youtube.channels.list({
        part: 'snippet',
        id: video.snippet.channelId,
      });

      const channel = channelResponse.data.items[0];
      
      if (channel) {
        console.log("---- Finished getting YouTube channel name ----");
        return channel.snippet.title;
      } else {
        console.error("Channel not found.");
        return "";
      }
    } else {
      console.error("Video not found.");
      return "";
    }
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return "";
  }
}


async function checkYoutubeCaptionedOrNot(videoId) {
  try {
    const youtubeAPIKey = await checkQuotaExceeded(videoId);
    console.log("---- Started checking video is captioned or not ----" + youtubeAPIKey);

    var youtube = google.youtube({
      version: 'v3',
      auth: youtubeAPIKey,
    });

    const response = await youtube.captions.list({
      part: 'snippet',
      videoId: videoId,
    });

    const captions = response.data.items || [];
    console.log("---- Finished checking video is captioned or not ----");
    return captions.length > 0;
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return false;
  }
}


async function getYoutubeCaptionDetails(videoId) {
  try {
    const youtubeAPIKey = await checkQuotaExceeded(videoId);

    console.log("---- Started checking video is captioned or not ----" + youtubeAPIKey);

    var youtube = google.youtube({
      version: 'v3',
      auth: youtubeAPIKey,
    });

    const response = await youtube.captions.list({
      part: 'snippet',
      videoId: videoId,
    });

    const captions = response.data.items || [];

    console.log("---- Finished checking video is captioned or not ----");

    if (captions.length === 0) {
      return [captions.length > 0, 'No Caption'];
    }

    let captionType = '';
    for (const caption of captions) {
      captionType += caption.snippet.trackKind;
      captionType += ', ';
    }

    console.log(captionType);

    var captionedStatus = captions.length > 0;
    captionType = captionType.slice(0, -2)

    if(captionType.includes('standard')){
        captionType = "standard"
        captionedStatus = true;
    }
    else if(!(captionType === "No Caption")){
      captionedStatus = false;
      captionType = "ASR";
    }

    console.log("---- Finished checking video type ----");
    return [captionedStatus, captionType];
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return [false, 'No Caption'];
  }
}


async function getYoutubeCaptionedType(videoId) {
  try {
    const youtubeAPIKey = await checkQuotaExceeded(videoId);

    console.log("---- Started checking video type ----" + youtubeAPIKey);

    var youtube = google.youtube({
      version: 'v3',
      auth: youtubeAPIKey,
    });

    const response = await youtube.captions.list({
      part: 'snippet',
      videoId: videoId,
    });

    const captions = response.data.items || [];

    if (captions.length === 0) {
      return 'No Caption';
    }

    let captionType = '';
    for (const caption of captions) {
      captionType += caption.snippet.trackKind;
      captionType += ', ';
    }

    console.log("---- Finished checking video type ----");

    return captionType.slice(0, -2);
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return 'No Caption';
  }
}


async function getCaptionedType(entryId) {
  try {
    const secretsParams = {
      secret: kalturaAPIKey,
      partnerId: 1530551,
      privileges: '',
      type: 2,
      userId: 'captions@usu.edu',
      format: 1,
    };
  
    console.log("---- Started checking video is captioned type ----");
  
    const startSessionUrl = 'https://www.kaltura.com/api_v3/service/session/action/start';
    const startSessionResponse = await axios.get(startSessionUrl, { params: secretsParams });
    const ks = startSessionResponse.data;
  
    const listCaptionParams = {
      ks: ks,
      partnerId: 1530551,
      format: 1,
      filter: {
        objectType: 'KalturaAssetFilter',
        entryIdEqual: entryId,
      },
    };
  
    const listCaptionUrl = 'https://www.kaltura.com/api_v3/service/caption_captionasset/action/list';
    const listCaptionResponse = await axios.post(listCaptionUrl, listCaptionParams);
    const captions = listCaptionResponse.data.objects;
    for (const caption of captions) {
      if (caption.displayOnPlayer) {
        return caption.label || 'No Captions';
      }
    }
  
    console.log("---- Finished checking video is captioned type ----");
  
    return 'No Captions';
  }
  catch(err){
    console.log(err)
  }
}


// Assuming the functions checkCaptionedOrNot, getCaptionedType,
// checkYoutubeCaptionedOrNot, and getYoutubeCaptionedType are defined

async function getAllUrls(allUrls) {
  try {
    for (const title in allUrls) {
      const captions = {};

      for (const [key, value] of Object.entries(allUrls[title].entry_id)) {
        for (const entryId of value) {
          let captionedStatus, captionType;
          let duration = '00:00:00'
          
          if (key === 'Kaltura') {
              console.log(entryId);
              captionedStatus = await checkCaptionedOrNot(entryId);
              captionType = await getCaptionedType(entryId);
              duration = await getKalturaVideoDuration(entryId)

              console.log(duration)
              console.log(captionedStatus);
              console.log(captionType);
          } else if (key === 'YouTube') {
              captionedStatus = await checkYoutubeCaptionedOrNot(entryId);
              captionType = await getYoutubeCaptionedType(entryId);
    
              if (captionType.includes('standard')) {
                captionType = 'standard';
                captionedStatus = true;
              } else if (captionType !== 'No Caption') {
                captionedStatus = false;
                captionType = 'ASR';
              }
          } else if (key === 'Video' || key === 'Audio') {
              captionedStatus = null;
              captionType = null;
          }
  
          captions[entryId] = [captionedStatus, key, captionType, duration];
        }
      }

      allUrls[title].entry_id = captions;
    }

    return allUrls;
  }
  catch(err){
    console.log(err)
  }
}


// Assuming the functions get_all_pages, get_all_assignments,
// get_all_discussions, get_all_quizzes, get_url, and getAllUrls are defined

async function getCaptionedVideos(courseId) {
  try {
    const allPages = await getAllPages(courseId);
    const allAssignments = await getAllAssignments(courseId);
    const allDiscussion = await getAllDiscussions(courseId);
    const allQuizzes = await getAllQuizzes(courseId);

    const allUrls = await getUrl(courseId, allPages, 'pages');
    const allUrlsAssignment = await getUrl(courseId, allAssignments, 'assignments');
    const allUrlsDiscussion = await getUrl(courseId, allDiscussion, 'discussions');
    const allUrlsQuizzes = await getUrl(courseId, allQuizzes, 'quizzes');
  
    const result = [];
  
    result.push(await getAllUrls(allUrls));
    result.push(await getAllUrls(allUrlsAssignment));
    result.push(await getAllUrls(allUrlsDiscussion));
    result.push(await getAllUrls(allUrlsQuizzes));

    console.log(result)
    return result;
  }
  catch(err){
    console.log(err)
  }
}

module.exports = {
    getCaptionedVideos,
    addCategories,
    getYouTubeChannelName,
    checkYoutubeCaptionedOrNot,
    getYoutubeCaptionedType,
    getYoutubeCaptionDetails
};
  