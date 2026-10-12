import React,{useState,useEffect,useRef}from'react';import{SafeAreaView,View,Text,TextInput,Pressable,TouchableOpacity,ScrollView,StyleSheet,Alert,Platform,Image,useWindowDimensions,KeyboardAvoidingView,Keyboard}from'react-native';import{StatusBar}from'expo-status-bar';import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
// Local storage key used to save the student's projects on this device.
const STORAGE_KEY='@preproduction_projects_v1';
const workspacePhotos={
 Story:'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
 Screenplay:'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
 Dialogue:'https://images.unsplash.com/photo-1758525226597-6263703aca5f?auto=format&fit=crop&w=1200&q=80',
 Storyboard:'https://cdn.kastatic.org/ka-perseus-images/2bd63502f2f203c177bb174503fba0f7d33fdfcc.png',
 Locations:'https://www.nasa.gov/wp-content/uploads/2025/11/crater-052025-loiacono-3259.jpg',
 Cast:'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80',
 Notes:'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80'
};

const secs=[['Story','✦','◯  ✎','IDEA → NARRATIVE'],['Screenplay','▤','INT. 01\nFADE IN','WRITE THE SCENE'],['Dialogue','◌','“ ... ”','CHARACTER VOICE'],['Storyboard','▦','▱ ▱\n▱ ▱','VISUALIZE SHOTS'],['Locations','⌖','⌂  •  ⌖','BUILD THE WORLD'],['Cast','♟','◉ ◉ ◉','CHARACTERS'],['Notes','✎','—  —  —','CAPTURE IDEAS']];
const blank=n=>({name:n||'Untitled Project',type:'Short Film',Story:{title:n||'Untitled Project',logline:'',synopsis:'',genre:'',themes:''},Screenplay:'FADE IN:\n\nINT. LOCATION - DAY\n\nBegin your screenplay here.',Dialogue:[],Storyboard:[],Locations:[],Cast:[],Notes:[]});
const Field=({label,value,onChange,multi,placeholder})=><View><Text style={s.label}>{label}</Text><TextInput value={value??''} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#777E84" multiline={multi} autoCorrect={false} autoCapitalize="sentences" blurOnSubmit={false} style={[s.input,multi&&s.multi]}/></View>;
const WorkspaceShell=({projectName,eyebrow,title,subtitle,icon,children,onSave,onBack,saveLabel='SAVE',showFooter=true,compact=false})=>
<KeyboardAvoidingView style={s.keyboardAvoid} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?8:0}>
<ScrollView style={s.wsScroll} contentContainerStyle={[s.wsPage,compact&&s.wsPageMobile]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} automaticallyAdjustKeyboardInsets={Platform.OS==='ios'}>
  <View style={[s.wsHero,compact&&s.wsHeroMobile]}>
    <View style={[s.wsHeroCopy,compact&&s.wsHeroCopyMobile]}><Text style={s.wsEyebrow}>{eyebrow}</Text><Text style={[s.wsHeroTitle,compact&&s.wsHeroTitleMobile]}>{projectName}</Text><Text style={s.wsHeroSub}>{subtitle}</Text></View>
    <View style={[s.wsHeroIcon,compact&&s.wsHeroIconMobile]}><Text style={s.wsHeroIconText}>{icon}</Text></View>
  </View>
  <View style={[s.workspacePhotoWrap,compact&&s.workspacePhotoWrapMobile]}>
    <Image source={{uri:workspacePhotos[title]}} style={s.workspacePhoto} resizeMode="cover" />
    <View style={s.workspacePhotoShade}/>
    <View style={s.workspacePhotoLabel}><Text style={s.workspacePhotoLabelText}>{title.toUpperCase()}</Text></View>
  </View>
  <View style={[s.wsCurrentBar,compact&&s.wsCurrentBarMobile]}>
    <View><Text style={s.wsBarLabel}>CURRENT PROJECT</Text><Text style={s.wsBarTitle}>{projectName}</Text><Text style={s.wsBarSub}>{title} workspace</Text></View>
    <Pressable style={[s.wsBackBtn,compact&&s.wsBackBtnMobile]} onPress={onBack}><Text style={s.wsBackText}>BACK TO WORKSPACES</Text></Pressable>
  </View>
  <View style={[s.wsContent,compact&&s.wsContentMobile]}>{children}</View>
  {showFooter&&<View style={[s.wsActions,compact&&s.wsActionsMobile]}>
    {onSave&&<Pressable style={s.wsSave} onPress={onSave}><Text style={s.wsSaveText}>{saveLabel}</Text></Pressable>}
    <Pressable style={s.wsCancel} onPress={onBack}><Text style={s.wsCancelText}>CANCEL</Text></Pressable>
  </View>}
</ScrollView>
</KeyboardAvoidingView>;

export default function App(){const{width}=useWindowDimensions();const compact=width<850;const[projects,setProjects]=useState([]);const[hydrated,setHydrated]=useState(false);const saveTimer=useRef(null);const[active,setActive]=useState(null);const[page,setPage]=useState('Projects');const[creating,setCreating]=useState(false);const[projectEdit,setProjectEdit]=useState(null);const[newName,setNewName]=useState('');const[newType,setNewType]=useState('Short Film');const[adding,setAdding]=useState(false);const[editing,setEditing]=useState(null);const[draft,setDraft]=useState({title:'',subtitle:'',details:''});const[storyDraft,setStoryDraft]=useState(null);const[screenDraft,setScreenDraft]=useState(null);const[confirmDelete,setConfirmDelete]=useState(null);const[message,setMessage]=useState('');const[search,setSearch]=useState('');const p=active===null?null:projects[active];
useEffect(()=>{(async()=>{try{const raw=await AsyncStorage.getItem(STORAGE_KEY);if(raw){const saved=JSON.parse(raw);setProjects(Array.isArray(saved)?saved:[])}else{setProjects([])}}catch(e){setProjects([])}finally{setHydrated(true)}})()},[]);
useEffect(()=>{if(!hydrated)return;if(saveTimer.current)clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>{AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(projects)).catch(()=>{})},250);return()=>{if(saveTimer.current)clearTimeout(saveTimer.current)}},[projects,hydrated]);

const update=q=>{if(active===null)return;let a=[...projects];a[active]=q;setProjects(a)};const close=()=>{setAdding(false);setEditing(null)};const add=()=>{setDraft({title:'',subtitle:'',details:''});setEditing(null);setAdding(true)};const edit=(x,i)=>{setDraft({...x});setEditing(i);setAdding(true)};const save=k=>{if(!draft.title.trim()){Alert.alert('Add a title');return}let a=[...p[k]];editing===null?a.push({...draft}):a[editing]={...draft};update({...p,[k]:a});close()};const del=(k,i)=>update({...p,[k]:p[k].filter((_,j)=>j!==i)});const us=(k,v)=>update({...p,Story:{...p.Story,[k]:v}});
const Header=()=> page==='Projects'
?<View style={[s.topBar,compact&&s.topBarCompact]}>
  <View style={s.brandRow}>
    <View style={s.logoBox}><Text style={s.logoIcon}>🎬</Text></View>
    <View>
      <Text style={[s.brandMain,compact&&s.brandMainCompact]}>PROplan</Text>
      <Text style={[s.brandSub,compact&&s.brandSubCompact]}>Plan  ·  Create  ·  Bring Stories to Life</Text>
    </View>
  </View>
  
</View>
:<View style={s.head}>
  <Pressable onPress={()=>{setPage('Projects');setActive(null);close()}}><Text style={s.back}>‹</Text></Pressable>
  <View><Text style={s.brand}>PROplan</Text><Text style={s.ht}>{page==='Home'?'Project Workspace':page}</Text></View>
</View>;
const safeFileName=(name)=>(name||'preproduction-project').replace(/[^a-zA-Z0-9-_]+/g,'-').replace(/^-+|-+$/g,'')||'preproduction-project';
const exportProject=async(i)=>{
  try{
    const project=projects[i];
    if(!project)return;
    const payload={format:'ProPlanProject',version:1,exportedAt:new Date().toISOString(),project};
    const fileName=safeFileName(project.name)+'.preproduction.json';
    const json=JSON.stringify(payload,null,2);
    if(Platform.OS==='web'){
      const blob=new Blob([json],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage('Exported "'+project.name+'" to your browser downloads.');
      return;
    }
    const uri=FileSystem.cacheDirectory+fileName;
    await FileSystem.writeAsStringAsync(uri,json);
    if(await Sharing.isAvailableAsync()){
      await Sharing.shareAsync(uri,{mimeType:'application/json',dialogTitle:'Save or share '+project.name});
      setMessage('Export ready for "'+project.name+'".');
    }else setMessage('Sharing is not available on this device.');
  }catch(e){
    setMessage('Could not export project: '+(e?.message||'unknown error'));
  }
};
const importProject=async()=>{
  try{
    const result=await DocumentPicker.getDocumentAsync({type:['application/json','text/json','text/plain'],copyToCacheDirectory:true,multiple:false});
    if(result.canceled)return;
    const asset=result.assets&&result.assets[0];
    if(!asset?.uri)return;
    const raw=await FileSystem.readAsStringAsync(asset.uri);
    const parsed=JSON.parse(raw);
    const project=parsed?.format==='ProPlanProject'?parsed.project:parsed;
    if(!project||typeof project!=='object'||!project.name)throw new Error('Invalid project');
    const clean={...blank(project.name),...project,name:String(project.name)};
    setProjects(prev=>[...prev,clean]);
    setMessage('Imported "'+clean.name+'".');
  }catch(e){setMessage('That file is not a valid ProPlan project.');}
};
const Loading=()=> <View style={s.loading}><Text style={s.kicker}>PROplan</Text><Text style={s.loadingTitle}>Loading projects…</Text><Text style={s.light}>Restoring your locally saved workspace.</Text></View>;
const Home=()=> !p?Projects():<ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"><View style={s.hero}><Text style={s.film}>● ━━━ ● ━━━ ●</Text><Text style={s.kicker}>OPEN PROJECT</Text><Text style={s.big}>{p.name}</Text><Text style={s.light}>{p.type} • Pre-production workspace</Text><Text style={s.camera}>◉  ◉  ▰</Text></View><View style={s.project}><View style={{flex:1}}><Text style={s.micro}>CURRENT PROJECT</Text><Text style={s.projectTitle}>{p.name}</Text><Text style={s.projectType}>Choose a workspace below</Text></View><Pressable style={s.switch} onPress={()=>{setActive(null);setStoryDraft(null);setScreenDraft(null);setPage('Projects')}}><Text style={s.switchText}>CLOSE PROJECT</Text></Pressable></View><Text style={s.label}>WORKSPACES</Text><View style={s.grid}>{secs.map(x=><Pressable key={x[0]} style={s.tile} onPress={()=>setPage(x[0])}><View style={s.workspaceCardTop}><Text style={s.workspaceCardIcon}>{x[1]}</Text><View><Text style={s.tileTag}>{x[3]}</Text><Text style={s.tt}>{x[0]}</Text></View></View></Pressable>)}</View></ScrollView>;
const Projects=()=> {
const visible=projects.map((q,i)=>({q,i})).filter(({q})=>q.name.toLowerCase().includes(search.toLowerCase()));
return <View style={[s.projectsRoot,compact&&s.projectsRootMobile]}>
  {Platform.OS==='web'&&<Image pointerEvents="none" source={require('./assets/cinematic-orange-flavors-bg.jpg')} style={s.cinematicBg} resizeMode="cover"/>}
  {!compact&&<Image pointerEvents="none" source={require('./assets/clapperboard-transparent.png')} style={s.heroBoard} resizeMode="contain"/>}
  {Platform.OS==='web'&&<View pointerEvents="none" style={s.projectsShade}/>}
  <ScrollView style={[s.projectsScroll,compact&&s.projectsScrollMobile]} contentContainerStyle={[s.projectsPage,compact&&s.projectsPageCompact]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
  {!creating&&projectEdit===null?<>
    <View style={[s.projectsTop,compact&&s.projectsTopCompact]}>
      <View style={[s.leftColumn,compact&&s.leftColumnCompact]}>
        <View style={s.welcomeCard}>
          <Text style={s.startHere}>START HERE</Text>
          <Text style={[s.projectsTitle,compact&&s.projectsTitleCompact]}>Your Projects</Text>
          <Text style={s.projectsIntro}>Create a new project or open an existing project. Your projects are saved locally on this device. Story, Screenplay, Dialogue, Storyboard, Locations, Cast and Notes become available after you open a project.</Text>
        </View>

        <Pressable style={s.newProjectButton} onPress={()=>{setNewName('');setNewType('Short Film');setCreating(true)}}>
          <Text style={s.actionIcon}>＋</Text>
          <View style={s.actionCopy}><Text style={s.actionTitle}>Create New Project</Text><Text style={s.actionSub}>Build a new pre-production workspace.</Text></View>
          <View style={s.arrowCircle}><Text style={s.arrowText}>›</Text></View>
        </Pressable>

        <TouchableOpacity style={s.importProjectButton} onPress={importProject}>
          <Text style={s.folderIcon}>▱</Text>
          <View style={s.actionCopy}><Text style={s.actionTitle}>Import Project File</Text><Text style={s.actionSub}>Open a saved project from your device.</Text></View>
          <View style={s.arrowCircleMuted}><Text style={s.arrowText}>›</Text></View>
        </TouchableOpacity>
        {message!==''&&<Text style={s.message}>{message}</Text>}
      </View>
      {!compact&&<View style={s.heroSpacer}/>}
    </View>

    <View style={s.existingPanel}>
      <View style={[s.existingHeader,compact&&s.existingHeaderCompact]}>
        <Text style={s.existingTitle}>EXISTING PROJECTS</Text>
        <View style={[s.searchBox,compact&&s.searchBoxCompact]}><Text style={s.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Search projects..." placeholderTextColor="#BFC3C7" style={s.searchInput}/></View>
      </View>
      {projects.length===0?<View style={s.emptyCinematic}>
        <Text style={s.filmIcon}>▦</Text>
        <Text style={s.emptyCinematicTitle}>No saved projects yet</Text>
        <Text style={s.emptyCinematicText}>Create your first project above. It will be saved automatically{"\n"}on this device.</Text>
      </View>:visible.map(({q,i})=><View key={i} style={s.projectListCard}>
        <Pressable style={s.projectOpen} onPress={()=>{setActive(i);setStoryDraft(null);setScreenDraft(null);setPage('Home')}}>
          <View style={s.poster}><Text style={s.posterIcon}>▶</Text></View>
          <View style={{flex:1}}><Text style={s.cardTitle}>{q.name}</Text><Text style={s.sub}>{q.type}</Text><Text style={s.details}>Tap to open project</Text></View><Text style={s.openArrow}>›</Text>
        </Pressable>
        {confirmDelete===i?<View style={s.confirmBox}><Text style={s.confirmText}>Delete “{q.name}”?</Text><View style={s.projectActions}><Pressable style={s.smallButton} onPress={()=>setConfirmDelete(null)}><Text style={s.smallButtonText}>CANCEL</Text></Pressable><Pressable style={s.deleteConfirm} onPress={()=>{setProjects(projects.filter((_,j)=>j!==i));setConfirmDelete(null);setActive(null)}}><Text style={s.deleteConfirmText}>YES, DELETE</Text></Pressable></View></View>:<View style={s.projectActions}><Pressable style={s.smallButton} onPress={()=>{setProjectEdit(i);setNewName(q.name);setNewType(q.type)}}><Text style={s.smallButtonText}>EDIT</Text></Pressable><Pressable style={s.exportBtn} onPress={()=>exportProject(i)}><Text style={s.exportText}>EXPORT</Text></Pressable><Pressable style={s.deleteButton} onPress={()=>setConfirmDelete(i)}><Text style={s.deleteButtonText}>DELETE</Text></Pressable></View>}
      </View>)}
    </View>
  </>:<View style={[s.formWrap,compact&&s.formWrapCompact]}><View style={s.form}><Text style={s.formTitle}>{projectEdit===null?'CREATE NEW PROJECT':'EDIT PROJECT'}</Text><Field label="PROJECT NAME" value={newName} onChange={setNewName} placeholder="Example: 7PM (The Loop)"/><Text style={s.label}>PROJECT TYPE</Text><View style={s.chips}>{['Short Film','Film','Music Video','Animation'].map(x=><Pressable key={x} onPress={()=>setNewType(x)} style={[s.chip,newType===x&&s.chipOn]}><Text style={[s.chipText,newType===x&&s.white]}>{x}</Text></Pressable>)}</View><Pressable style={[s.add,compact&&s.addMobile]} onPress={()=>{if(!newName.trim()){Alert.alert('Enter a project name');return}if(projectEdit===null){let a=[...projects,blank(newName.trim())];a[a.length-1].type=newType;setProjects(a);setActive(a.length-1);setStoryDraft(null);setScreenDraft(null);setCreating(false);setNewName('');setPage('Home')}else{let a=[...projects];a[projectEdit]={...a[projectEdit],name:newName.trim(),type:newType,Story:{...a[projectEdit].Story,title:newName.trim()}};setProjects(a);setProjectEdit(null);setNewName('');setPage('Projects')}}}><Text style={s.addt}>{projectEdit===null?'CREATE & OPEN PROJECT':'SAVE CHANGES'}</Text></Pressable><Pressable style={s.cancel} onPress={()=>{setCreating(false);setProjectEdit(null)}}><Text style={s.cancelText}>CANCEL</Text></Pressable></View></View>}
  </ScrollView>
</View>};
const Intro=({k})=>{let x=secs.find(z=>z[0]===k);return <View style={s.sectionHero}><View style={s.largeArt}><Text style={s.largeArtText}>{x[2]}</Text></View><Text style={s.kicker}>{x[3]}</Text><Text style={s.sectionBig}>{k}</Text><Text style={s.activeName}>{p.name}</Text></View>};
const Story=()=>{
const d=storyDraft||{...p.Story};
return <WorkspaceShell compact={compact} projectName={p.name} eyebrow="STORY DEVELOPMENT" title="Story" subtitle="Shape the idea, structure the narrative, and capture the heart of your project." icon="✦"
onSave={()=>{update({...p,Story:d});setStoryDraft(null);setPage('Home')}} onBack={()=>{setStoryDraft(null);setPage('Home')}} saveLabel="SAVE STORY">
  <View style={[s.wsGrid,compact&&s.wsGridMobile]}>
    <View style={[s.wsPanel,compact&&s.wsPanelMobile]}><View style={s.wsPanelHead}><Text style={s.wsPanelIcon}>✎</Text><View><Text style={s.wsPanelKicker}>CORE IDEA</Text><Text style={s.wsPanelTitle}>Story Foundation</Text></View></View>
      <Field label="STORY TITLE" value={d.title||''} onChange={v=>setStoryDraft({...d,title:v})} placeholder="Enter story title"/>
      <Field label="LOGLINE" value={d.logline||''} onChange={v=>setStoryDraft({...d,logline:v})} placeholder="Describe the story in one sentence"/>
    </View>
    <View style={[s.wsPanel,compact&&s.wsPanelMobile]}><View style={s.wsPanelHead}><Text style={s.wsPanelIcon}>▤</Text><View><Text style={s.wsPanelKicker}>NARRATIVE</Text><Text style={s.wsPanelTitle}>Story Summary</Text></View></View>
      <Field label="SUMMARY" value={d.summary||''} onChange={v=>setStoryDraft({...d,summary:v})} placeholder="Write the main story..." multi/>
    </View>
  </View>
</WorkspaceShell>};
const Screenplay=()=>{const d=screenDraft===null?(p.Screenplay||''):screenDraft;return <WorkspaceShell compact={compact} projectName={p.name} eyebrow="SCRIPT DEVELOPMENT" title="Screenplay" subtitle="Write and revise your screenplay continuously in one focused workspace." icon="▤" onSave={async()=>{if(active===null)return;const next=[...projects];next[active]={...next[active],Screenplay:d};setProjects(next);setScreenDraft(null);setMessage('Screenplay saved.');setPage('Home');try{await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch(e){Alert.alert('Save failed','The screenplay was updated in the app, but could not be saved to local storage on this device.')}}} onBack={()=>{setScreenDraft(null);setPage('Home')}} saveLabel="SAVE SCREENPLAY"><View style={[s.wsPanel,compact&&s.wsPanelMobile]}><View style={s.wsPanelHead}><Text style={s.wsPanelIcon}>▤</Text><View><Text style={s.wsPanelKicker}>WRITE THE SCENE</Text><Text style={s.wsPanelTitle}>Screenplay Editor</Text></View></View><TextInput multiline value={d} onChangeText={setScreenDraft} autoCorrect={false} blurOnSubmit={false} style={s.script}/></View></WorkspaceShell>};
const labs={Dialogue:['CHARACTER','SCENE','DIALOGUE'],Storyboard:['SHOT / FRAME','SHOT TYPE','DESCRIPTION'],Locations:['LOCATION','TYPE','LOCATION NOTES'],Cast:['CHARACTER / ACTOR','ROLE','CASTING NOTES'],Notes:['NOTE TITLE','CATEGORY','DETAILS']};
const List=({k})=>{const icon=k==='Dialogue'?'“':k==='Storyboard'?'▦':k==='Locations'?'⌖':k==='Cast'?'◉':'✎';const subtitle=k==='Dialogue'?'Organize character voices and scene exchanges.':k==='Storyboard'?'Build the visual plan one shot at a time.':k==='Locations'?'Develop and organize production locations.':k==='Cast'?'Build and revise your cast and character list.':'Capture production ideas and notes as they develop.';const saveAndContinue=()=>{if(!draft.title.trim()){Alert.alert('Add a title');return}let a=[...p[k]];editing===null?a.push({...draft}):a[editing]={...draft};update({...p,[k]:a});setDraft({title:'',subtitle:'',details:''});setEditing(null);setAdding(true)};return <WorkspaceShell compact={compact} projectName={p.name} eyebrow={k.toUpperCase()+' DEVELOPMENT'} title={k} subtitle={subtitle} icon={icon} onBack={()=>{close();setPage('Home')}} showFooter={false}><View style={[s.wsPanel,compact&&s.wsPanelMobile]}><View style={[s.listTop,compact&&s.listTopMobile]}><View><Text style={s.wsPanelKicker}>{k.toUpperCase()}</Text><Text style={s.wsPanelTitle}>{k} Workspace</Text></View>{!adding&&<Pressable style={[s.add,compact&&s.addMobile]} onPress={add}><Text style={s.addt}>＋ ADD ITEM</Text></Pressable>}</View>{adding?<View style={s.form}><Text style={s.formTitle}>{editing===null?'ADD':'EDIT'} {k.toUpperCase()}</Text><Field label={labs[k][0]} value={draft.title} onChange={v=>setDraft({...draft,title:v})}/><Field label={labs[k][1]} value={draft.subtitle} onChange={v=>setDraft({...draft,subtitle:v})}/><Field label={labs[k][2]} value={draft.details} onChange={v=>setDraft({...draft,details:v})} multi/><View style={s.listFormActions}><Pressable style={s.listSaveBtn} onPress={saveAndContinue}><Text style={s.addt}>{editing===null?'SAVE & ADD ANOTHER':'SAVE CHANGES'}</Text></Pressable><Pressable style={s.listDoneBtn} onPress={close}><Text style={s.cancelText}>DONE</Text></Pressable></View></View>:<>{p[k].length===0?<View style={s.cleanEmpty}><Text style={s.cleanEmptyIcon}>{icon}</Text><Text style={s.emptyTitle}>No {k.toLowerCase()} items yet</Text><Text style={s.details}>Choose ADD ITEM to begin.</Text></View>:p[k].map((x,i)=><View style={s.card} key={i}><Text style={s.number}>{String(i+1).padStart(2,'0')}</Text><View style={{flex:1}}><Text style={s.cardTitle}>{x.title}</Text><Text style={s.sub}>{x.subtitle}</Text><Text style={s.details}>{x.details}</Text><View style={s.actions}><Pressable onPress={()=>edit(x,i)}><Text style={s.edit}>EDIT</Text></Pressable><Pressable onPress={()=>del(k,i)}><Text style={s.delete}>DELETE</Text></Pressable></View></View></View>)}</>}</View></WorkspaceShell>};
let c=!hydrated?Loading():page==='Projects'?Projects():active===null?Projects():page==='Home'?Home():page==='Story'?Story():page==='Screenplay'?Screenplay():List({k:page});return (
  <View style={s.appRoot}>
    {Platform.OS==='web'&&<Image pointerEvents="none" source={require('./assets/cinematic-orange-flavors-bg.jpg')} style={s.globalCinematicBg} resizeMode="cover"/>}
    {Platform.OS==='web'&&<View pointerEvents="none" style={s.globalCinematicShade}/>}
    <SafeAreaView style={[s.safeTransparent,compact&&s.safeMobile]}>
      <StatusBar style="light"/>
      <View style={[s.contentShell,compact&&s.contentShellMobile]}>
        {Header()}
        {c}
      </View>
    </SafeAreaView>
  </View>
)}
const s=StyleSheet.create({
keyboardAvoid:{flex:1,width:'100%'},
mobileSpacer:{height:4},
wsHeroMobile:{minHeight:0,padding:18,flexDirection:'column',alignItems:'flex-start'},
wsHeroCopyMobile:{paddingRight:0,width:'100%'},
wsHeroTitleMobile:{fontSize:30,lineHeight:36},
wsHeroIconMobile:{width:64,height:64,borderRadius:16,marginTop:16,alignSelf:'flex-start'},
workspacePhotoWrapMobile:{height:180,marginBottom:14},
wsCurrentBarMobile:{padding:16,flexDirection:'column',alignItems:'stretch',gap:14},
wsBackBtnMobile:{alignSelf:'stretch',alignItems:'center',paddingHorizontal:12},
wsContentMobile:{marginTop:14,width:'100%'},
wsGridMobile:{flexDirection:'column',width:'100%',gap:12},
wsPanelMobile:{flexBasis:'auto',flexGrow:0,width:'100%',padding:18},
listTopMobile:{flexDirection:'column',alignItems:'stretch',gap:14},
addMobile:{alignSelf:'stretch',alignItems:'center',justifyContent:'center'},
wsActionsMobile:{flexDirection:'column',width:'100%',gap:10},


safeMobile:{flex:1,width:'100%'},
wsPageMobile:{paddingHorizontal:14,paddingTop:14,paddingBottom:180},
contentShellMobile:{flex:1,width:'100%',maxWidth:'100%',minHeight:1,zIndex:2},
projectsRootMobile:{flex:1,width:'100%',minHeight:1,overflow:'visible',backgroundColor:'#a43b12'},
projectsScrollMobile:{flex:1,width:'100%',backgroundColor:'transparent'},
listTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18,gap:12},
cleanEmpty:{alignItems:'center',paddingVertical:34},
cleanEmptyIcon:{fontSize:34,color:'#FF5A1F',fontWeight:'900'},
workspaceCardTop:{flexDirection:'row',alignItems:'center',gap:14,paddingTop:12},
workspaceCardIcon:{width:46,height:46,borderRadius:12,borderWidth:1,borderColor:'#FF5A1F',backgroundColor:'rgba(255,90,31,.08)',textAlign:'center',paddingTop:10,fontSize:20,fontWeight:'900',color:'#FF5A1F'},
creativeIcon:{flex:1,alignItems:'center',justifyContent:'center'},
creativeIconMark:{width:72,height:72,borderRadius:18,borderWidth:1,borderColor:'#FF5A1F',backgroundColor:'rgba(255,90,31,.08)',alignItems:'center',justifyContent:'center'},
creativeIconSymbol:{fontSize:28,color:'#FF5A1F',fontWeight:'900'},
creativeIconDetail:{fontSize:8,color:'#FFFFFF',fontWeight:'900',letterSpacing:1,marginTop:2},
creativeIconLabel:{fontSize:9,color:'#92989E',fontWeight:'900',letterSpacing:1.5,marginTop:8},
wsPage:{padding:24,paddingBottom:180,flexGrow:1},
wsHero:{minHeight:220,borderRadius:24,borderWidth:1,borderColor:'#34383d',backgroundColor:'rgba(21,24,27,.94)',padding:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
wsHeroCopy:{flex:1,paddingRight:20},
wsEyebrow:{fontSize:13,fontWeight:'900',letterSpacing:3,color:'#FF5A1F'},
wsHeroTitle:{fontSize:42,lineHeight:48,fontWeight:'900',color:'#FFFFFF',marginTop:10},
wsHeroSub:{fontSize:16,lineHeight:25,color:'#BFC3C7',marginTop:12,maxWidth:720},
wsHeroIcon:{width:118,height:118,borderRadius:24,backgroundColor:'rgba(255,90,31,.12)',borderWidth:1,borderColor:'#FF5A1F',alignItems:'center',justifyContent:'center'},
wsHeroIconText:{fontSize:50,color:'#FF5A1F',fontWeight:'900'},
wsCurrentBar:{marginTop:18,backgroundColor:'rgba(30,20,18,.90)',borderLeftWidth:4,borderLeftColor:'#FF5A1F',padding:22,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
wsBarLabel:{fontSize:11,fontWeight:'900',letterSpacing:2,color:'#92989E'},
wsBarTitle:{fontSize:22,fontWeight:'900',color:'#FFFFFF',marginTop:5},
wsBarSub:{fontSize:13,color:'#BFC3C7',marginTop:3},
wsBackBtn:{borderWidth:1,borderColor:'#FF5A1F',borderRadius:12,paddingHorizontal:16,paddingVertical:12},
wsBackText:{fontSize:11,fontWeight:'900',color:'#FF5A1F'},
wsContent:{marginTop:20},
wsGrid:{flexDirection:'row',gap:16,flexWrap:'wrap'},
wsPanel:{flexGrow:1,flexBasis:420,backgroundColor:'rgba(25,17,16,.92)',borderRadius:20,borderWidth:1,borderColor:'#34383d',padding:22},
wsPanelWide:{backgroundColor:'rgba(25,17,16,.92)',borderRadius:20,borderWidth:1,borderColor:'#34383d',padding:22},
wsPanelHead:{flexDirection:'row',alignItems:'center',marginBottom:18},
wsPanelIcon:{fontSize:20,color:'#FF5A1F',fontWeight:'900',marginRight:12},
wsPanelKicker:{fontSize:10,fontWeight:'900',letterSpacing:2,color:'#FF5A1F'},
wsPanelTitle:{fontSize:20,fontWeight:'900',color:'#FFFFFF',marginTop:3},
wsActions:{flexDirection:'row',gap:12,marginTop:18},
wsSave:{backgroundColor:'#FF5A1F',borderRadius:14,paddingVertical:15,paddingHorizontal:24},
wsSaveText:{fontWeight:'900',color:'#FFFFFF'},
wsCancel:{backgroundColor:'rgba(25,17,16,.92)',borderRadius:14,borderWidth:1,borderColor:'#FF5A1F',paddingVertical:15,paddingHorizontal:24},
wsCancelText:{fontWeight:'900',color:'#FF5A1F'},
wsListHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},
wsAddButton:{backgroundColor:'#FF5A1F',borderRadius:12,paddingVertical:13,paddingHorizontal:18},
wsAddText:{fontWeight:'900',color:'#FFFFFF'},
wsFormCard:{backgroundColor:'rgba(17,19,21,.72)',borderRadius:16,padding:18,borderWidth:1,borderColor:'#34383d',marginBottom:16},
wsInlineActions:{flexDirection:'row',gap:10,marginTop:8},
wsEmpty:{alignItems:'center',paddingVertical:34},
wsEmptyTitle:{fontSize:17,fontWeight:'900',color:'#FFFFFF',marginTop:12},
wsEmptyText:{fontSize:13,color:'#92989E',marginTop:6},
wsItemCard:{flexDirection:'row',backgroundColor:'rgba(17,19,21,.72)',borderRadius:15,padding:17,borderWidth:1,borderColor:'#34383d',marginBottom:10},
wsItemLabel:{fontSize:9,fontWeight:'900',letterSpacing:1.5,color:'#FF5A1F'},
wsItemText:{fontSize:14,color:'#FFFFFF',marginTop:2},
wsItemActions:{justifyContent:'center',gap:12,paddingLeft:14},
wsEdit:{fontSize:11,fontWeight:'900',color:'#FF5A1F'},
wsDelete:{fontSize:11,fontWeight:'900',color:'#d77b73'},
graphicNew:{flex:1,alignItems:'center',justifyContent:'center'},
graphicSymbol:{fontSize:34,color:'#FF5A1F',fontWeight:'800'},
graphicLabel:{fontSize:10,color:'#92989E',fontWeight:'900',letterSpacing:2,marginTop:6},
storyPage:{padding:24,paddingBottom:50},
storyHero:{minHeight:235,borderRadius:24,borderWidth:1,borderColor:'#34383d',backgroundColor:'rgba(21,24,27,.94)',padding:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
storyHeroCopy:{flex:1,paddingRight:20},
storyEyebrow:{fontSize:13,fontWeight:'900',letterSpacing:3,color:'#FF5A1F'},
storyHeroTitle:{fontSize:42,lineHeight:48,fontWeight:'900',color:'#FFFFFF',marginTop:10},
storyHeroSub:{fontSize:16,lineHeight:25,color:'#BFC3C7',marginTop:12,maxWidth:700},
storyHeroIcon:{width:120,height:120,borderRadius:24,backgroundColor:'rgba(255,90,31,.12)',borderWidth:1,borderColor:'#FF5A1F',alignItems:'center',justifyContent:'center'},
storyHeroIconText:{fontSize:56,color:'#FF5A1F'},
storyCurrentBar:{marginTop:18,backgroundColor:'rgba(30,20,18,.90)',borderLeftWidth:4,borderLeftColor:'#FF5A1F',padding:22,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
storyBarLabel:{fontSize:11,fontWeight:'900',letterSpacing:2,color:'#92989E'},
storyBarTitle:{fontSize:22,fontWeight:'900',color:'#FFFFFF',marginTop:5},
storyBarSub:{fontSize:13,color:'#BFC3C7',marginTop:3},
storyBackBtn:{borderWidth:1,borderColor:'#FF5A1F',borderRadius:12,paddingHorizontal:16,paddingVertical:12},
storyBackText:{fontSize:11,fontWeight:'900',color:'#FF5A1F'},
storyGrid:{flexDirection:'row',gap:16,marginTop:20,flexWrap:'wrap'},
storyPanel:{flexGrow:1,flexBasis:420,backgroundColor:'rgba(25,17,16,.92)',borderRadius:20,borderWidth:1,borderColor:'#34383d',padding:22},
storyPanelHead:{flexDirection:'row',alignItems:'center',marginBottom:18},
storyPanelIcon:{fontSize:24,color:'#FF5A1F',marginRight:12},
storyPanelKicker:{fontSize:10,fontWeight:'900',letterSpacing:2,color:'#FF5A1F'},
storyPanelTitle:{fontSize:20,fontWeight:'900',color:'#FFFFFF',marginTop:3},
storyActions:{flexDirection:'row',gap:12,marginTop:18},
storySave:{backgroundColor:'#FF5A1F',borderRadius:14,paddingVertical:15,paddingHorizontal:24},
storySaveText:{fontWeight:'900',color:'#FFFFFF'},
storyCancel:{backgroundColor:'rgba(25,17,16,.92)',borderRadius:14,borderWidth:1,borderColor:'#FF5A1F',paddingVertical:15,paddingHorizontal:24},
storyCancelText:{fontWeight:'900',color:'#FF5A1F'},
globalCinematicBg:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
globalCinematicShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(47,14,4,.18)'},
safeTransparent:{flex:1,backgroundColor:'transparent'},
cinematicBg:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
heroBoard:{position:'absolute',right:'4%',top:'4%',width:'43%',height:'62%'},
projectsShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(30,8,2,0.10)'}, 
appRoot:{flex:1,backgroundColor:'#7b2c0d',position:'relative'},
nativeMobileBase:{flex:1,backgroundColor:'#7b2c0d'},
safe:{flex:1,backgroundColor:'transparent'},
contentShell:{flex:1,width:'100%',maxWidth:1600,alignSelf:'center'},
projectsRoot:{flex:1,position:'relative',overflow:'hidden',backgroundColor:'#d75c17'},
orangeBase:{...StyleSheet.absoluteFillObject,backgroundColor:'#d75c17'},
heroImage:{position:'absolute',right:-35,top:-55,width:'61%',height:'78%',opacity:1},
_legacy_projectsShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(88,28,8,0.12)'},
projectsScroll:{flex:1},
projectsPage:{paddingHorizontal:42,paddingTop:26,paddingBottom:30},
projectsPageCompact:{paddingHorizontal:16,paddingTop:16},
topBar:{minHeight:112,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:42,paddingVertical:18,backgroundColor:'rgba(117,39,18,.78)'},
topBarCompact:{minHeight:88,paddingHorizontal:18,paddingVertical:12,width:'100%',flexShrink:0},
brandRow:{flexDirection:'row',alignItems:'center'},
logoBox:{width:56,height:56,alignItems:'center',justifyContent:'center',marginRight:18},
logoIcon:{fontSize:42},
brandMain:{fontSize:24,fontWeight:'900',letterSpacing:3,color:'#fff'},
brandMainCompact:{fontSize:18,letterSpacing:2},
brandSub:{fontSize:17,color:'#F2F2F2',marginTop:4},
brandSubCompact:{fontSize:12},
topActions:{flexDirection:'row'},
topAction:{alignItems:'center',minWidth:72,marginLeft:18},
topIcon:{width:44,height:44,borderRadius:22,borderWidth:1,borderColor:'rgba(255,255,255,.55)',textAlign:'center',paddingTop:8,fontSize:20,fontWeight:'800',color:'#fff'},
topLabel:{fontSize:11,color:'#fff',marginTop:5},
projectsTop:{flexDirection:'row',minHeight:535},
projectsTopCompact:{minHeight:0,flexDirection:'column',width:'100%'},
leftColumn:{width:'55%',maxWidth:820},
leftColumnCompact:{width:'100%',maxWidth:'100%',flexShrink:0},
heroSpacer:{flex:1},
welcomeCard:{backgroundColor:'rgba(20,15,14,.88)',borderRadius:24,paddingHorizontal:38,paddingVertical:32,marginBottom:18},
startHere:{fontSize:15,fontWeight:'900',letterSpacing:3,color:'#FF5A1F'},
projectsTitle:{fontSize:44,lineHeight:51,fontWeight:'900',color:'#fff',marginTop:8},
projectsTitleCompact:{fontSize:34,lineHeight:40},
projectsIntro:{fontSize:16,lineHeight:25,color:'#F8E9E2',marginTop:14,maxWidth:720},
newProjectButton:{minHeight:108,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(240,82,22,.97)',borderRadius:22,paddingHorizontal:28,marginBottom:14,borderWidth:1,borderColor:'rgba(255,126,52,.95)'},
importProjectButton:{minHeight:108,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(42,24,18,.90)',borderRadius:22,paddingHorizontal:28,borderWidth:2,borderColor:'#FF5A1F'},
actionIcon:{fontSize:48,fontWeight:'300',color:'#fff',marginRight:25},
folderIcon:{fontSize:45,color:'#fff',marginRight:25},
actionCopy:{flex:1},
actionTitle:{fontSize:22,fontWeight:'900',color:'#fff'},
actionSub:{fontSize:15,color:'#FFE2D6',marginTop:4},
arrowCircle:{width:52,height:52,borderRadius:26,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},
arrowCircleMuted:{width:52,height:52,borderRadius:26,backgroundColor:'rgba(255,255,255,.12)',alignItems:'center',justifyContent:'center'},
arrowText:{fontSize:42,lineHeight:44,color:'#fff',marginTop:-5},
existingPanel:{backgroundColor:'rgba(25,14,12,.82)',borderRadius:24,borderWidth:1,borderColor:'rgba(255,255,255,.48)',padding:28,minHeight:285,marginTop:8},
existingHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
existingHeaderCompact:{alignItems:'flex-start',flexDirection:'column'},
existingTitle:{fontSize:17,fontWeight:'900',letterSpacing:3,color:'#fff'},
searchBox:{width:320,height:52,borderWidth:1,borderColor:'rgba(255,255,255,.48)',borderRadius:14,flexDirection:'row',alignItems:'center',paddingHorizontal:14,backgroundColor:'rgba(25,18,16,.55)'},
searchBoxCompact:{width:'100%',marginTop:14},
searchIcon:{fontSize:27,color:'#fff',marginRight:9},
searchInput:{flex:1,color:'#fff',fontSize:14},
emptyCinematic:{alignItems:'center',justifyContent:'center',paddingTop:30,paddingBottom:10},
filmIcon:{fontSize:40,color:'#C9CDD1'},
emptyCinematicTitle:{fontSize:19,fontWeight:'900',color:'#fff',marginTop:12},
emptyCinematicText:{fontSize:14,lineHeight:21,color:'#D7DADF',textAlign:'center',marginTop:7},
formWrap:{maxWidth:760,width:'57%',paddingTop:15},
formWrapCompact:{width:'100%'},

_old_projectsPage:{paddingHorizontal:34,paddingTop:24,paddingBottom:34},
_old_topBar:{minHeight:112,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:38,paddingVertical:18,backgroundColor:'rgba(116,38,17,0.58)'},
_old_brandRow:{flexDirection:'row',alignItems:'center',gap:18},
_old_logoBox:{width:54,height:54,alignItems:'center',justifyContent:'center'},
_old_logoIcon:{fontSize:42},
_old_brandMain:{fontSize:23,fontWeight:'900',letterSpacing:2.4,color:'#fff'},
_old_brandSub:{fontSize:17,color:'#FFD9C8',marginTop:4},
_old_topActions:{flexDirection:'row',gap:34},
_old_topAction:{alignItems:'center',minWidth:54},
_old_topIcon:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'rgba(255,255,255,.55)',textAlign:'center',textAlignVertical:'center',paddingTop:7,fontSize:20,fontWeight:'800',color:'#fff'},
_old_topLabel:{fontSize:11,color:'#fff',marginTop:5},
_old_projectsTop:{flexDirection:'row',minHeight:525},
_old_leftColumn:{width:'58%',maxWidth:820},
_old_heroSpacer:{flex:1},
_old_welcomeCard:{backgroundColor:'rgba(20,15,14,.82)',borderRadius:24,paddingHorizontal:36,paddingVertical:31,marginBottom:18},
_old_startHere:{fontSize:14,fontWeight:'900',letterSpacing:3,color:'#FF5A1F'},
_old_projectsTitle:{fontSize:42,lineHeight:49,fontWeight:'900',color:'#fff',marginTop:8},
_old_projectsIntro:{fontSize:16,lineHeight:25,color:'#F8E9E2',marginTop:14,maxWidth:700},
_old_newProjectButton:{minHeight:108,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(240,74,21,.92)',borderRadius:22,paddingHorizontal:28,marginBottom:14,borderWidth:1,borderColor:'rgba(255,174,92,.8)'},
_old_importProjectButton:{minHeight:108,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(39,23,17,.84)',borderRadius:22,paddingHorizontal:28,borderWidth:2,borderColor:'#F4511E'},
_old_actionIcon:{fontSize:48,fontWeight:'300',color:'#fff',marginRight:25},
_old_folderIcon:{fontSize:45,color:'#fff',marginRight:25},
_old_actionCopy:{flex:1},
_old_actionTitle:{fontSize:22,fontWeight:'900',color:'#fff'},
_old_actionSub:{fontSize:15,color:'#FFE2D6',marginTop:4},
_old_arrowCircle:{width:52,height:52,borderRadius:26,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},
_old_arrowCircleMuted:{width:52,height:52,borderRadius:26,backgroundColor:'rgba(255,255,255,.12)',alignItems:'center',justifyContent:'center'},
_old_arrowText:{fontSize:42,lineHeight:44,color:'#fff',marginTop:-5},
_old_existingPanel:{backgroundColor:'rgba(31,18,14,.76)',borderRadius:24,borderWidth:1,borderColor:'rgba(255,255,255,.45)',padding:28,minHeight:280,marginTop:4},
_old_existingHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
_old_existingTitle:{fontSize:16,fontWeight:'900',letterSpacing:3,color:'#fff'},
_old_searchBox:{width:310,height:52,borderWidth:1,borderColor:'rgba(255,255,255,.48)',borderRadius:14,flexDirection:'row',alignItems:'center',paddingHorizontal:14,backgroundColor:'rgba(25,18,16,.38)'},
_old_searchIcon:{fontSize:27,color:'#fff',marginRight:9},
_old_searchInput:{flex:1,color:'#fff',fontSize:14,outlineStyle:'none'},
_old_emptyCinematic:{alignItems:'center',justifyContent:'center',paddingTop:28,paddingBottom:8},
_old_filmIcon:{fontSize:38,color:'#C9CDD1'},
_old_emptyCinematicTitle:{fontSize:18,fontWeight:'900',color:'#fff',marginTop:12},
_old_emptyCinematicText:{fontSize:14,lineHeight:21,color:'#D7DADF',textAlign:'center',marginTop:7},
_old_formWrap:{maxWidth:760,width:'100%',alignSelf:'flex-start',paddingTop:15},

_old_contentShell:{flex:1,width:'100%',maxWidth:1600,alignSelf:'center'},
_old_appRoot:{flex:1,backgroundColor:'#FF6A1A'},
fullBackground:{flex:1,width:'100%',height:'100%'},
fullBackgroundImage:{opacity:1},
pageTint:{flex:1,backgroundColor:'rgba(0,0,0,0.06)'}, _old_safe:{flex:1,backgroundColor:'transparent'},head:{minHeight:66,flexDirection:'row',alignItems:'center',paddingHorizontal:18,backgroundColor:'#15181b',borderBottomWidth:1,borderColor:'#34383d'},back:{fontSize:38,marginRight:14,color:'#FF5A1F'},brand:{fontSize:9,letterSpacing:2.3,fontWeight:'900',color:'#FF5A1F'},ht:{fontSize:19,fontWeight:'900',color:'#FFFFFF'},body:{padding:18,paddingBottom:60},hero:{backgroundColor:'#1a1d20',borderRadius:22,padding:24,marginBottom:14,borderWidth:1,borderColor:'#34383d'},film:{fontSize:18,color:'#33383d',textAlign:'right'},kicker:{fontSize:10,letterSpacing:2.2,fontWeight:'900',color:'#FF6A1A'},big:{fontSize:33,lineHeight:39,fontWeight:'900',color:'#F2F2F2',marginTop:9},light:{fontSize:12,color:'#FFFFFF',marginTop:10},camera:{fontSize:25,color:'#FF6A1A',marginTop:20},project:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(18,18,20,0.90)',borderLeftWidth:3,borderColor:'#FF6A1A',padding:15,marginBottom:18},micro:{fontSize:8,letterSpacing:1.7,fontWeight:'900',color:'#FF5A1F'},projectTitle:{fontSize:18,fontWeight:'900',color:'#F2F2F2',marginTop:4},projectType:{fontSize:11,color:'#AEB3B8',marginTop:3},switch:{borderWidth:1,borderColor:'#60666C',borderRadius:10,padding:9},switchText:{fontSize:9,fontWeight:'900',color:'#FF6A1A'},label:{fontSize:9,fontWeight:'900',letterSpacing:1.5,color:'#FF5A1F',marginTop:14,marginBottom:8},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{width:'48%',backgroundColor:'rgba(18,18,20,0.88)',borderRadius:16,padding:14,minHeight:165,borderWidth:1,borderColor:'#34383d'},artBox:{height:54,borderRadius:10,backgroundColor:'#23272a',justifyContent:'center',alignItems:'center',marginBottom:9},art:{fontSize:16,lineHeight:21,fontWeight:'900',color:'#6c655e',textAlign:'center',letterSpacing:2},icon:{fontSize:18,color:'#FF6A1A'},tileTag:{fontSize:7,letterSpacing:1.1,fontWeight:'900',color:'#FF6A1A',marginTop:7},tt:{fontSize:16,fontWeight:'900',color:'#F2F2F2',marginTop:3},sectionHero:{backgroundColor:'#1a1d20',borderRadius:18,padding:18,marginBottom:16,borderWidth:1,borderColor:'#34383d'},sectionBig:{fontSize:28,fontWeight:'900',color:'#F2F2F2',marginTop:5},largeArt:{height:70,backgroundColor:'#23272a',borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:14},largeArtText:{fontSize:21,lineHeight:27,letterSpacing:3,fontWeight:'900',color:'#656B71',textAlign:'center'},activeName:{fontSize:10,fontWeight:'900',color:'#FF6A1A',marginTop:10,textTransform:'uppercase'},create:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:'#E64A19',borderRadius:16,padding:17,marginBottom:16},plus:{fontSize:30,color:'white'},createTitle:{fontSize:16,fontWeight:'900',color:'white'},createText:{fontSize:11,color:'#F2F2F2'},poster:{width:58,height:70,borderRadius:9,backgroundColor:'#2a2e31',alignItems:'center',justifyContent:'center'},posterIcon:{fontSize:20,color:'#FF6A1A'},input:{backgroundColor:'rgba(18,18,20,0.88)',borderWidth:1,borderColor:'#3b3f44',borderRadius:12,padding:13,fontSize:14,color:'#F2F2F2'},multi:{minHeight:95,textAlignVertical:'top'},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{backgroundColor:'#292d31',padding:8,borderRadius:18},chipOn:{backgroundColor:'#E64A19'},chipText:{fontSize:11,fontWeight:'800',color:'#D8D8D8'},white:{color:'white'},script:{minHeight:560,backgroundColor:'#E7E7E7',borderRadius:10,padding:21,fontSize:13,lineHeight:22,fontFamily:'Courier',color:'#202020',textAlignVertical:'top'},empty:{alignItems:'center',padding:30,backgroundColor:'rgba(18,18,20,0.90)',borderRadius:15,marginBottom:12},emptyArt:{fontSize:24,lineHeight:30,color:'#656B71',fontWeight:'900',textAlign:'center'},emptyTitle:{fontSize:16,fontWeight:'900',color:'#F2F2F2',marginTop:12},card:{backgroundColor:'rgba(18,18,20,0.88)',borderRadius:14,padding:15,marginBottom:10,flexDirection:'row',gap:13,borderWidth:1,borderColor:'#34383d'},selected:{borderColor:'#E64A19'},number:{fontSize:11,fontWeight:'900',color:'#FF6A1A'},cardTitle:{fontSize:15,fontWeight:'900',color:'#FFFFFF'},sub:{fontSize:9,fontWeight:'900',color:'#FF6A1A',marginTop:4},details:{fontSize:11,lineHeight:17,color:'#AEB3B8',marginTop:6},actions:{flexDirection:'row',gap:20,marginTop:10},edit:{fontSize:9,fontWeight:'900',color:'#FF6A1A'},delete:{fontSize:9,fontWeight:'900',color:'#d77b73'},add:{backgroundColor:'#E64A19',padding:14,borderRadius:12,alignItems:'center',marginTop:9},addt:{color:'#FFFFFF',fontWeight:'900',fontSize:11},form:{backgroundColor:'rgba(18,18,20,0.90)',borderRadius:16,padding:16},formTitle:{fontSize:19,fontWeight:'900',color:'#FFFFFF'},cancel:{padding:14,alignItems:'center'},cancelText:{fontSize:10,fontWeight:'900',color:'#FF5A1F'},workspaceHint:{fontSize:11,color:'#92989E',marginTop:-3,marginBottom:12},projectListCard:{backgroundColor:'rgba(18,18,20,0.88)',borderRadius:15,padding:13,marginBottom:12,borderWidth:1,borderColor:'#34383d'},projectOpen:{flexDirection:'row',gap:13},projectActions:{flexDirection:'row',gap:8,marginTop:12,paddingTop:11,borderTopWidth:1,borderColor:'#303438'},smallButton:{flex:1,borderWidth:1,borderColor:'#6F767C',borderRadius:9,padding:10,alignItems:'center'},smallButtonText:{fontSize:9,fontWeight:'900',color:'#FF5A1F'},deleteButton:{borderWidth:1,borderColor:'#714744',borderRadius:9,padding:10,alignItems:'center'},deleteButtonText:{fontSize:9,fontWeight:'900',color:'#d77b73'},openArrow:{fontSize:30,color:'#FF6A1A',alignSelf:'center'},confirmBox:{marginTop:12,padding:12,borderRadius:10,backgroundColor:'#241b1b',borderWidth:1,borderColor:'#714744'},confirmText:{fontSize:12,fontWeight:'800',color:'#F2F2F2'},deleteConfirm:{backgroundColor:'#FF5A1F',borderColor:'#FF5A1F',flex:1,borderRadius:9,padding:10,alignItems:'center'},importBtn:{borderWidth:1,borderColor:'#E64A19',padding:13,alignItems:'center',marginBottom:18},importText:{fontSize:10,fontWeight:'900',letterSpacing:1,color:'#FF7043'},message:{fontSize:11,color:'#FF7043',marginBottom:14},exportBtn:{borderWidth:1,borderColor:'#E64A19',paddingVertical:8,paddingHorizontal:10,marginRight:7},exportText:{fontSize:8,fontWeight:'900',color:'#FF5A1F',letterSpacing:.7},deleteConfirmText:{fontSize:9,fontWeight:'900',color:'#fff'},loading:{flex:1,alignItems:'center',justifyContent:'center',padding:30},loadingTitle:{fontSize:22,fontWeight:'900',color:'#F2F2F2',marginTop:8},saveRow:{flexDirection:'row',gap:10,marginTop:18,marginBottom:12},saveBtn:{flex:1,backgroundColor:'#E64A19',borderRadius:11,padding:14,alignItems:'center'},saveBtnText:{fontSize:11,fontWeight:'900',color:'#FFFFFF',letterSpacing:.8},cancelBtn:{flex:1,borderWidth:1,borderColor:'#697077',borderRadius:11,padding:14,alignItems:'center'},cancelBtnText:{fontSize:11,fontWeight:'900',color:'#D8D8D8',letterSpacing:.8},
wsScroll:{flex:1},workspacePhotoWrap:{height:190,borderRadius:18,overflow:'hidden',marginBottom:18,borderWidth:1,borderColor:'rgba(255,90,31,0.45)',position:'relative'},workspacePhoto:{width:'100%',height:'100%'},workspacePhotoShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.28)'},workspacePhotoLabel:{position:'absolute',left:18,bottom:16,backgroundColor:'rgba(17,19,21,0.82)',paddingHorizontal:14,paddingVertical:8,borderRadius:10,borderLeftWidth:4,borderLeftColor:'#FF5A1F'},workspacePhotoLabelText:{color:'#FFFFFF',fontWeight:'900',letterSpacing:1.2,fontSize:14},
wsPage:{padding:24,paddingBottom:42},
wsContent:{marginTop:20,width:'100%'},
wsPanel:{width:'100%',backgroundColor:'rgba(25,17,16,.94)',borderRadius:20,borderWidth:1,borderColor:'#34383d',padding:24},
script:{minHeight:340,maxHeight:520,backgroundColor:'rgba(18,18,20,.92)',borderWidth:1,borderColor:'#3b3f44',borderRadius:14,padding:18,fontSize:14,lineHeight:22,fontFamily:Platform.OS==='ios'?'Courier':'monospace',color:'#F2F2F2',textAlignVertical:'top'},
form:{width:'100%',backgroundColor:'rgba(18,18,20,.92)',borderRadius:16,padding:20},
listFormActions:{flexDirection:'row',alignItems:'center',gap:12,marginTop:16},
listSaveBtn:{flex:1,backgroundColor:'#E64A19',paddingVertical:15,paddingHorizontal:18,borderRadius:12,alignItems:'center'},
listDoneBtn:{minWidth:130,borderWidth:1,borderColor:'#FF5A1F',paddingVertical:15,paddingHorizontal:22,borderRadius:12,alignItems:'center'},
wsActions:{flexDirection:'row',alignItems:'center',gap:12,marginTop:18,marginBottom:10},
wsSave:{backgroundColor:'#FF5A1F',borderRadius:14,paddingVertical:15,paddingHorizontal:24,minWidth:180,alignItems:'center'},
wsCancel:{backgroundColor:'rgba(25,17,16,.92)',borderRadius:14,borderWidth:1,borderColor:'#FF5A1F',paddingVertical:15,paddingHorizontal:24,minWidth:130,alignItems:'center'}
});
