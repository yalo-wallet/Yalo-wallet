export type Lang = "ha" | "en";
export const copy = {
  ha: {
    dashboard:"Babban shafi", wallet:"Walat", markets:"Kasuwanni", swap:"Musanya", trade:"Trading", p2p:"P2P", earn:"Earn", history:"Tarihi", settings:"Saituna",
    total:"Jimillar ƙimar kadarori", available:"Ma'aunin walat", assets:"Kadarori", recent:"Ma'amaloli na baya-bayan nan", viewAll:"Duba duka",
    connect:"Haɗa walat", login:"Shiga", logout:"Fita", send:"Aika", receive:"Karɓa", buy:"Saya", sell:"Sayar", deposit:"Ajiye", withdraw:"Cire",
    search:"Nemo coin ko token", network:"Network", address:"Adireshin walat", copy:"Kwafi", copied:"An kwafa", scan:"QR code",
    coming:"Zai zo nan gaba", live:"Aiki", overview:"Taƙaitaccen bayani", portfolio:"Portfolio", pnl:"Riba / Asara", price:"Farashi", change:"Canji",
    noTx:"Babu tarihin ma'amala tukuna.", loginHint:"Shiga domin duba walat ɗinka.", language:"Harshe", hausa:"Hausa", english:"English",
    notice:"Sanarwa", maintenance:"Sanarwar gyara", close:"Rufe", sendSoon:"Aika crypto", receiveSoon:"Karɓi crypto",
    chain:"Blockchain", selectChain:"Zaɓi network", amount:"Adadi", recipient:"Adireshin wanda za a aika wa", confirm:"Tabbatar", cancel:"Soke",
    security:"Tsaro", profile:"Bayanan asusu", preferences:"Zaɓuɓɓuka", support:"Taimako", empty:"Babu bayanai tukuna",
    welcome:"", marketNote:"Farashin kasuwa zai bayyana idan an haɗa tushen bayanai.", p2pNote:"Kasuwancin P2P zai buƙaci haɗin escrow, biyan kuɗi da tsarin rikici kafin a kunna shi.",
    earnNote:"Earn da staking za su bayyana ne bayan an haɗa ingantaccen mai samar da sabis.", swapNote:"An shirya wurin musanya. Ba a kunna musanya ba sai an saita hanyoyin kasuwanci.",
    tradingNote:"Wurin trading na Solana yana jiran haɗin Jupiter da gwajin transactions.", maintenanceText:"Ana gudanar da gyara a wasu ayyuka. Wasu fasaloli na iya zama a kashe na ɗan lokaci."
  },
  en: {
    dashboard:"Dashboard", wallet:"Wallet", markets:"Markets", swap:"Swap", trade:"Trade", p2p:"P2P", earn:"Earn", history:"History", settings:"Settings",
    total:"Total portfolio value", available:"Wallet balance", assets:"Assets", recent:"Recent activity", viewAll:"View all",
    connect:"Connect wallet", login:"Log in", logout:"Log out", send:"Send", receive:"Receive", buy:"Buy", sell:"Sell", deposit:"Deposit", withdraw:"Withdraw",
    search:"Search coin or token", network:"Network", address:"Wallet address", copy:"Copy", copied:"Copied", scan:"QR code",
    coming:"Coming Soon", live:"Live", overview:"Overview", portfolio:"Portfolio", pnl:"Profit / Loss", price:"Price", change:"Change",
    noTx:"No transactions yet.", loginHint:"Log in to view your wallet.", language:"Language", hausa:"Hausa", english:"English",
    notice:"Announcement", maintenance:"Maintenance notice", close:"Close", sendSoon:"Send crypto", receiveSoon:"Receive crypto",
    chain:"Blockchain", selectChain:"Select network", amount:"Amount", recipient:"Recipient address", confirm:"Confirm", cancel:"Cancel",
    security:"Security", profile:"Account", preferences:"Preferences", support:"Support", empty:"Nothing here yet",
    welcome:"", marketNote:"Market prices will appear when a data provider is connected.", p2pNote:"P2P requires escrow, payment rails and dispute handling before activation.",
    earnNote:"Earn and staking will appear after a verified provider is integrated.", swapNote:"The swap workspace is prepared. Trading is not enabled until routes are configured.",
    tradingNote:"Solana trading is waiting for Jupiter integration and transaction testing.", maintenanceText:"Some services are undergoing maintenance. Certain features may be temporarily unavailable."
  }
} as const;