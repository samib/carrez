//importing modules
var express = require( 'express' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );
//creating a new express server
var app = express();
var ReponseFinale;
var test = "blablabla"


//setting EJS as the templating engine
app.set( 'view engine', 'ejs' );

//setting the 'assets' directory as our static assets dir (css, js, img, etc...)
//app.use( '/assets', express.static( 'assets' ) );
app.use(express.static(__dirname + '/public'));
//On va chercher le ejs
/*app.get('/',function(req,res){
    res.render('pages/index');
});*/
//Lancement du programme
app.get( '/process', function ( req, res ){
    const url = req.query.lbcUrl;  //vas chercher l'url du ejs
    if(url){//on tcheck la présence de l'url
        getLBCDATA(url, res, getMAEstimation)
    }else{
        res.render('pages/index',{ //si l'url n'existe pas
            error: 'Url is empty'
        });
    }
});



function parseMaData (html) {
    

    const priceAppartRegex = /\bappartement\b : (\d+) €/mi
    const priceHouseRegex = /\bmaison\b : (\d+) €/mi
    
    if(html)
    {
        const priceAppart = priceAppartRegex.exec( html ) && priceAppartRegex.exec( html ).length === 2 ? priceAppartRegex.exec( html )[1] :0
        const priceHouse = priceHouseRegex.exec( html ) && priceHouseRegex.exec( html ).length === 2 ? priceHouseRegex.exec( html )[1] :0
        if (priceAppart && priceHouse){
            return maData = {//tableau a 2 dimensions
                priceAppart,
                priceHouse
            }
        }
    }
    
}

function getMAEstimation(lbcData, routeResponse)
{
    if( lbcData.city && lbcData.postalCode && lbcData.surface && lbcData.price)
    {
        //on va chercher le prix moyen sur meilleurs agent en prenant la ville et le code postal
        const url='https://www.meilleursagents.com/prix-immobilier/{city}-{postalCode}/'.replace('{city}',lbcData.city.replace(/\_/g,'-') ).replace( '{postalCode}', lbcData.postalCode);
        console.log('MA URL: ',url)

        request( url, function(error,response, html){
                //cas sans erreur
                if(!error){
                 let $ = cheerio.load(html); //chargement de la page html           
                    if($ ('meta[name=description]').get().length === 1 && $( 'meta[name=description]').get()[0].attribs && $('meta[name=description]').get()[0].attribs.content)
                 
                 var maData=parseMaData(html) //va chercher les prix
                //selection du type
                if(lbcData.type==='appartement'){
                    var ref = maData.priceAppart;
                }else{
                    var ref = maData.priceHouse;
                }
                //affichage
                console.log('prix appartement moyen:', maData.priceAppart)
                console.log('prix maison moyen:', maData.priceAppart)
                    if(maData.priceAppart && maData.priceHouse)
                    {
                        //Verification de la qualité du deal
                        ReponseFinale = isGoodDeal(lbcData,ref);
                        
                        routeResponse.render('pages/index', 
                        {
                            ReponseFinale:ReponseFinale,lbcData,ref
                                
                        })
                        console.log('conclusion: ',ReponseFinale)
                    }
                }else{
                    console.log('erreur lors du scrapping de MA')
                }
            }//module pour parser le doc html (parser=analyser)}
               )
    }
}

function parseLBCData( html ){
    const $ = cheerio.load(html)
    const lbcDataArray = $('section.properties span.value' )
    const lbcDataArray2 = $('section.properties span.property' )
    var typeDeBien;
    var surfaceDuBien;
    //On va sélectionner le bon type et la bonne surface sur la page
    for ( var i = 0; i < $ ( lbcDataArray2).length ; i++){
            if($( lbcDataArray2.get( i )).text()==='Type de bien'){
                typeDeBien = $( lbcDataArray.get( i )).text()
            }
            if($( lbcDataArray2.get( i )).text()==='Surface'){
                surfaceDuBien = $( lbcDataArray.get( i )).text()
            }
        }
        //attribution des valeurs
    return lbcData = {
        price: parseInt( $( lbcDataArray.get( 0 )).text().replace(/\s/g,''),10),
        city: $(lbcDataArray.get(1)).text().trim().toLowerCase().replace( /\_|\s/g, '-' ).replace(/\-\d+/,''),
        postalCode: $(lbcDataArray.get(1)).text().trim().toLowerCase().replace(/\D|\-/g,''),
        type: typeDeBien.trim().toLowerCase(),
        surface: parseInt( surfaceDuBien.replace(/\s/g,''),10)
    }
};

function getLBCDATA( lbcUrl, routeResponse, callback){
    request( lbcUrl, function(error,response, html){
        if(!error){
            let $ =cheerio.load(html);//module pour parser le document html
            
            const lbcData = parseLBCData( html )
            if( lbcData) {
                console.log('LBC Data',lbcData )//affiche dans la console
                callback( lbcData, routeResponse )
            }else{
              routeResponse.render('pages/index',{
                  error: 'No data found'
              });                 
            }
        }else{
              routeResponse.render('pages/index',{
                  error: 'No data found'
              });
        }

   });
}

function isGoodDeal( lbcData, maData){
    //prix moyen de ce profil de bien dans ville et departement
    var Prixnormal = (lbcData.surface * maData);

    console.log("le prix normal moyen du bien doit être", Prixnormal)
    console.log("le prix actuel du bien est", lbcData.price)

    
    var Resultatfinal;
    //condition de good ou bad deal
    if((Prixnormal>lbcData.price)) {
        Resultatfinal="Good Deal ! Vous économisez : " + (Prixnormal - lbcData.price) + "euros"
    }else{
        Resultatfinal="Bad Deal ! Vous perdez : " + (lbcData.price - Prixnormal)  + "euros"
    }
   
   return Resultatfinal    
}

//makes the server respond to the '/' route and serving the 'home.ejs' template in the 'views' directory
app.get( '/process', function ( req, res ) {
    const url = req.query.lbcUrl;
    //req:requete res:reponse
    if(url){
        getLBCDATA(url, res, getMAEstimation)
        console.log(test)
    }else{
        res.render('pages/index',{//on a un repertoire page avec un fichier index.html
            error: 'Url is empty'
        });
    }
    
});

//launch the server on the 3000 port
app.listen( 3000, function () {
    console.log( 'App listening on port 3000!' );
});