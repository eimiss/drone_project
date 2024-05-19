import Header from '../Components/Header';
const MainPage = () => {
    return (
        <div style={styles.fullDiv}>
            <Header />
            <div style={styles.blackBorders}>
                <div style={{textAlign: 'center', fontSize: '20px', fontWeight: 'bold'}}>Realiu laiku veikianti aplinkos stebėjimo sistema su vaizdo perdanga iš skirtingų bepiločių orlaivių</div>
                <div style={{textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginTop: '30px'}}> Sistemos intrukcija:</div>
                <div> •	Upload videos and images – šį mygtuką pasirenkate, jeigu norite tik įdėti pagrindinę nuotrauką ir kelis vaizdo įrašus, kuriuos apdoros ir paruoš sistema peržiūrai.</div>
                <div> •	Upload videos with map – šį mygtuką pasirenkate, jeigu jūsų nuotraukos yra išblukusios, neryškios arba tiesiog norite pasinaudoti žemėlapiu. Funkcionalumas skiriasi tuo, kad šiuo atveju jums patiems reikia susidėti bendrus požymių taškus tarp pagrindinės nuotraukos ir įkeltų vaizdo įrašų.</div>
                <div> •	Drone view – šis lankas pasirenkamas, jeigu norima prijungti bepiločius orlaivius ir gauti sugeneruotą vaizdą realiu laiku.</div>
                <div> •	History – pasirenkama, jeigu norima peržiūrėti prieš tai sugeneruotus vaizdo įrašus.</div>
            </div>
        </div>
    )
};

const styles = {
    fullDiv: {
        backgroundColor: '#020853',
        height: '100vh',
      },
      blackBorders: {
        backgroundColor: '#020831',
        borderRadius: '10px',
        padding: '20px',
        color: 'white',
        margin: 'auto',
        maxWidth: '1280px',
        display: 'flex',
        flexDirection: 'column',
        
        marginTop: "10px"
      },
}

export default MainPage;