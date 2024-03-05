
const EXCLUDED_URL = [
	"chrome://",
	"chrome-extension://",
	"edge://",
	"extensions://",
];

const savebutton = document.querySelector(".save-button");
async function reloadGroups(){
  const storageItem = await chrome.storage.sync.get(['userTabsGroups']);
  const userTabsGroups = storageItem.userTabsGroups || [];
  const groups = await chrome.tabGroups.query({});
  const tabs = await chrome.tabs.query({});

  groups.forEach((group) => {
    const existingGroupIndex = userTabsGroups.findIndex(existingGroup => existingGroup.groupDetails.title === group.title);
    if(existingGroupIndex === -1){
      const groupTabs = tabs.filter((tab) => tab.groupId === group.id);
      const filterTabs = groupTabs.map((tab)=>{
        return {
          url: tab.url,
          active: tab.active,
          id: tab.id,
          groupId: tab.groupId
        }
      })
      userTabsGroups.push({
        groupDetails: {
          id: group.id,
          color: group.color,
          title: group.title
        },
        tabs: filterTabs,
      });
    }else{
      const existingTabs = userTabsGroups[existingGroupIndex].tabs.map(existingTab => existingTab.url);

      const newTabs = tabs.filter((tab) => tab.groupId === group.id && !existingTabs.includes(tab.url));

      const filterTabs = newTabs.map((tab) => ({
        url: tab.url,
        active: tab.active,
        id: tab.id,
        groupId: tab.groupId
      }));

      userTabsGroups[existingGroupIndex].tabs = userTabsGroups[existingGroupIndex].tabs.concat(filterTabs);
    } 
  });
  console.log('userTabsGroups',userTabsGroups)
  await chrome.storage.sync.set({"userTabsGroups":userTabsGroups})
}
savebutton.addEventListener("click", async () => {
  
  await reloadGroups();
});

function shouldExcludeUrl(url) {
  return EXCLUDED_URL.some(excluded => url.includes(excluded));
}

const loadbutton = document.querySelector(".load-button");
loadbutton.addEventListener("click", async () => {

  const storageItemAutoAdd = await chrome.storage.sync.get(['AutoAdd']);
  const autoAdd = storageItemAutoAdd.AutoAdd;
  console.log('autoAdd',autoAdd)

  const storageItem = await chrome.storage.sync.get(['userTabsGroups']);
  const userTabsGroups = storageItem.userTabsGroups;
  console.log('userTabsGroups --',userTabsGroups )
  for (const groupData of userTabsGroups) {
    const groupDetails = groupData.groupDetails;

    const existingGroups = await chrome.tabGroups.query({});
    const existingGroup = existingGroups.find((group) => group.title === groupDetails.title);
    const existingTabs = await chrome.tabs.query({});
    if (existingGroup) {
      const existingGroupTabs = groupData.tabs;
      const existingTabIds = existingGroupTabs.map((tab)=>tab.id);
     // console.log(existingTabIds)
       //const createTabs = await chrome.tabs.group({ tabIds: existingTabIds });
      //   await chrome.tabGroups.update(createTabs, {
      //     title: groupDetails.title,
      //     color: groupDetails.color,
      //   });
      // //const notGroupedTags = existingTabs.filter((tab)=>tab.url !==existingGroupTabs.url);
      // const nonGroupTabs = existingTabs.filter((tab)=>tab.groupId === -1);
      // const nonGroupTabIDs=[];
      // for(const tab of nonGroupTabs){
      //   const tabGroupExists = existingGroupTabs.filter((t)=>t.url ===tab.url);
      //   console.log('exisws---',tabGroupExists);
      //   if(tabGroupExists && tabGroupExists.length){
      //     nonGroupTabIDs.push(tabGroupExists.id)
      //   }
      // }
      
      // if(nonGroupTabIDs.length){
      //   console.log(existingGroupTabs)
      //   const existingTabIds = existingGroupTabs.map((tab)=>tab.id);
      //   const joinTabIds = [...new Set([...existingTabIds, ...nonGroupTabIDs])];
      //   console.log(joinTabIds)
      //   //const createTabs = await chrome.tabs.group({ tabIds: joinTabIds });
      //   // await chrome.tabGroups.update(createTabs, {
      //   //   title: groupDetails.title,
      //   //   color: groupDetails.color,
      //   // });
      // }
      
      // Group is already open, check for missing tabs
      // const tabs = await chrome.tabs.query({ groupId: existingGroup.id });
      // const missingTabIds = tabIds.filter((tabId) => !tabs.some((tab) => tab.id === tabId));

      // for (const missingTabId of missingTabIds) {
      //   const tabInfo = groupData.tabs.find((tab) => tab.id === missingTabId);

      //   if (tabInfo) {
      //     await chrome.tabs.create({
      //       url: tabInfo.url,
      //       active: tabInfo.active,
      //     });
      //   }
      // }
    } else {
      // Group is not open, open the entire group
      
      const filterOpenTabsFromStorage = groupData.tabs.filter((tab)=> existingTabs.some((t)=>t.url === tab.url))
      console.log('filter open tabs',filterOpenTabsFromStorage);
      const existTabIds = filterOpenTabsFromStorage.map((tab)=>tab.id)
      const nonExistingTabs = groupData.tabs.filter((tab)=>existingTabs.every((t)=>t.url !== tab.url));
      const newTabIds = [];
      for(const tab of nonExistingTabs){
        const newTab = await chrome.tabs.create({
          url: tab.url,
          active: tab.active,
        });
        newTabIds.push(newTab.id);
      }
      const joinTabIds = [...new Set([...newTabIds, ...existTabIds])];
      const createTabs = await chrome.tabs.group({ tabIds: joinTabIds });
      await chrome.tabGroups.update(createTabs, {
        title: groupDetails.title,
        color: groupDetails.color,
        collapsed: true,
      });
    }
  }

 // await reloadGroups();
});


async function domainTabs(){
  const tabs = await chrome.tabs.query({});
  console.log(tabs)
    const ungroupedTabs = tabs.filter((tab)=>tab.groupId === -1);
    const removeExcludedTabs = ungroupedTabs.filter(tab=>!shouldExcludeUrl(tab.url))
    console.log(removeExcludedTabs)
    const dTabs= addDomain(removeExcludedTabs);
    return dTabs
}

const autoButton = document.querySelector(".auto-button");

autoButton.addEventListener("click",async ()=>{
  await groupTabsByDomainAndCreateGroups();


})


async function groupTabsByDomainAndCreateGroups() {
  const dTabs = await domainTabs();

  const domainMap = new Map();
  for (const tab of dTabs) {
    if (!domainMap.has(tab.domain)) {
      domainMap.set(tab.domain, []);
    }
    domainMap.get(tab.domain).push(tab);
  }
  for (const [domain, tabs] of domainMap.entries()) {
    const domainSplit = domain.split('.');
    const title = domainSplit[0];
    console.log('tital',title);
    const tabIds = tabs.map(tab => tab.id);
    const groupTabs = await chrome.tabs.group({tabIds})
    await chrome.tabGroups.update(groupTabs, {
      title,
    });
    // await chrome.tabGroups.create({ title: domain, tabIds: groupTabs });
    // console.log(`Tab group created for domain: ${domain}`);
  }
}

function extractHostname(url) {
  let hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("//") > -1) {
    hostname = url.split("/")[2];
  } else {
    hostname = url.split("/")[0];
  }

  //find & remove port number
  hostname = hostname.split(":")[0];
  //find & remove "?"
  hostname = hostname.split("?")[0];
  return hostname;
};

 function extractRootDomain (url) {
  console.log('url',url)
  let domain = extractHostname(url);
  console.log(domain)
   let splitArr = domain.split(".");
   let arrLen = splitArr.length;

  //extracting the root domain here
  //if there is a subdomain
  if (arrLen > 2) {
    domain = splitArr[arrLen - 2] + "." + splitArr[arrLen - 1];
    //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
    if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
      //this is using a ccTLD
      domain = splitArr[arrLen - 3] + "." + domain;
    }
  }
  return domain;
};

function addDomain (tabs)  {
    return tabs.map((tab)=>{
        const domain = extractRootDomain(tab.url);
        return { ...tab,domain};
    })
}
