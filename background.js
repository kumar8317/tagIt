chrome.runtime.onInstalled.addListener(async ()=>{
    await chrome.storage.sync.set({"userTabsGroups":[]})
    await chrome.storage.sync.set({"AutoAdd":true})
})

chrome.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
    //check if tab is present in userTabsGroups
})