          //===========================================================================================
//  ÍNDICE DE DESLIZAMIENTOS EVI-LS - TERREMOTOS, MOVIMIENTOS EN MASA –(EN DESARROLLO)!!!!
//===========================================================================================
// El índice de suelo desnudo es una variante del índice EVI, aplicado al canal rojo. Muestra toda la
// vegetación en verde y el suelo desnudo en rojo. Podría ser útil para el mapeo del suelo, ya que
// informa al usuario dónde puede hacer análisis de detección remota en terreno desnudo, dónde se
// recolectaron los cultivos o dónde no están creciendo, la ubicación de los deslizamientos de tierra
// o el grado de erosión en áreas no vegetadas. Desafortunadamente, también destaca ciertos edificios,
// lo que hace que las áreas de terreno desnudo sean difíciles de separar de las viviendas. Cabe señalar
// que el resultado depende de la vegetación de temporada y la agricultura.
//Funcion original en JavaScript:
// function evaluatePixel(image) {
 //   var val = 2.5 * ((B11 + B04)-(B08 + B02))/((B11 + B04)+(B08 + B02));
//    return [2.5* val, B08, B11];
//}

//function setup() {
//  return {
 //   input: [{
 //     bands: [
 //         "B02",
 //         "B04",
//          "B08",
//          "B11",
 //         "B12"
//      ]
 //   }],
//    output: { bands: 3 }
//  }
//}
//===========================================================================================

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

//*******************************************************************************************
//                             SELECCIONA TU PROPIA ÁREA DE ESTUDIO  

// Use la herramienta de polígono en la esquina superior izquierda del panel del mapa para
// dibujar la forma de su  Área de estudio. Los clics simples agregan vértices, al hacer doble
// clic se completa el polígono. ** CUIDADO **: en 'Importaciones de geometría' (arriba a la
// izquierda en el panel del mapa), desmarque cuadro de geometría, para evitar que se bloquee
// la vista en las imágenes más adelante.

//*******************************************************************************************
//                               CONFIGURA UN INTERVALO DE TIEMPO

// Establezca las fechas de inicio y fin de un período ANTES del Terremoto o evento. Asegúrese de que sea
// lo suficientemente amplio para adquirir una imagen Sentinel-2 (Revisita = 5 días). Ajuste
// estos parámetros, si tus colleciones o ImageCollections (ver Consola) no contienen ningún
// elemento.
var prefire_start = '2020-05-01';  
var prefire_end = '2020-05-30';

// Ahora establezca los mismos parámetros para DESPUÉS del Terremoto o evento.
var postfire_start = '2020-06-20';
var postfire_end = '2020-06-28';

//*******************************************************************************************
//                            SELECCIONA UNA PLATAFORMA DE SATELITE

// Puede seleccionar imágenes de dos sensores satelitales que estan disponibles.
// Considere los detalles de cada misión a continuación para elegir los datos adecuados para
//  sus necesidades.

// LANSAT 8                                |  SENTINEL-2 (A & B)
//-------------------------------------------------------------------------------------------
// Lanzado:       Febrero 11th, 2015       |  Junio 23rd, 2015 & Marzo 7th, 2017
// Revisita:      16 días                  |  5 días (desde 2017)
// Resolución:    30 metros                |  10 metros
// Ventajas:      Largas series de tiempo  |  9 series de alto detalle espacial
//       Exporta archivos archivo pequeños |  Mayor probabilidad de imágenes sin nubes

// SELECT uno de los siguientes:   'L8'  o 'S2'

var platform = 'S2';               // <--- asigne su elección a la variable de plataforma

//*******************************************************************************************
//---> ¡NO EDITE EL SCRIT A PARTIR DE ESTE PUNTO! (a menos que sepa lo que está haciendo) <--
//------------->>> YA PUEDE CORRER EL SCRIT EN LA PARTE SUPERIOR (RUN)! <<<----------------
//----> EL PRODUCTO DE SEVERIDAD FINAL ESTA LISTO PARA DESCARGAR A LA DERECHA (TASKS) <------

//*******************************************************************************************


//------------------------- Traduciendo las entradas del Usuario ----------------------------

// Imprimir plataforma satelital y fechas para la consola
if (platform == 'S2' | platform == 's2') {
  var ImCol = 'COPERNICUS/S2';
  var pl = 'Sentinel-2';
} else {
  var ImCol = 'LANDSAT/LC08/C01/T1_SR';
  var pl = 'Landsat 8';
}
print(ee.String('Datos seleccionados para el análisis: ').cat(pl));
print(ee.String('Incendio ocurrido entre ').cat(prefire_end).cat(' y ').cat(postfire_start));

// Localización
var area = ee.FeatureCollection(geometry);

// Selecciona el area de estudio como centro del mapa.
Map.centerObject(area);

//------------------- Selecciona imágenes Landsat por tiempo y ubicación --------------------

var imagery = ee.ImageCollection(ImCol);

// En las siguientes líneas, las imágenes se recopilarán en una ImageCollection, dependiendo de
// la ubicación de nuestra área de estudio, un marco de tiempo determinado y la proporción de
// cobertura de nubes.
var prefireImCol = ee.ImageCollection(imagery
    // Filtrar por fechas.
    .filterDate(prefire_start, prefire_end)
    // Filtrar por localizacion.
    .filterBounds(area));
   
// Selecciona todas las imágenes que se superponen con el área de estudio en el período de tiempo  
// determinado, como estado posterior al incendio, seleccionamos del 25 de febrero de 2017
var postfireImCol = ee.ImageCollection(imagery
    // Filtrar por fechas.
    .filterDate(postfire_start, postfire_end)
    // Filtrar por localizacion.
    .filterBounds(area));

// Agregua las imágenes recortadas a la consola da la derecha
print("Colección de imágenes pre-deslizamiento: ", prefireImCol);
print("Colección de imágenes post-deslizamiento: ", postfireImCol);

//--------------------------- Aplicar una máscara de nubes y nieve --------------------------

// Función para enmascarar nubes a partir de la banda de calidad de píxeles de los datos de
// la plataforma Sentinel-2 SR.
function maskS2sr(image) {
  // Los bits 10 y 11 son nubes y cirros, respectivamente.
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();
  // Obtenga la banda QA de control de calidad de píxeles.
  var qa = image.select('QA60');
  // Todos los indicadores deben establecerse en cero, lo que indica condiciones limpias o
  // libres de nubes.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  // Devuelve la imagen enmascarada y escalada a la reflectancia TOA, sin las bandas de QA.
  return image.updateMask(mask)
      .copyProperties(image, ["system:time_start"]);
}

// Función para enmascarar nubes de la banda de calidad de píxeles de los datos de la
// plataforma Landsat 8 SR.
function maskL8sr(image) {
  // Los bits 3 y 5 son nubes y sombras de nubes, respectivamente.
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;
  var snowBitMask = 1 << 4;
  // Obtenga la banda de control de calidad de píxeles.
  var qa = image.select('pixel_qa');
  // Todos los indicadores deben establecerse en cero, lo que indica condiciones claras o
  // libres de nubes.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0))
      .and(qa.bitwiseAnd(snowBitMask).eq(0));
  // Devuelva la imagen enmascarada y escalada a la reflectancia TOA, sin las bandas de QA.
  return image.updateMask(mask)
      .select("B[0-9]*")
      .copyProperties(image, ["system:time_start"]);
}

// Aplicar máscara de nube específica de la plataforma
if (platform == 'S2' | platform == 's2') {
  var prefire_CM_ImCol = prefireImCol.map(maskS2sr);
  var postfire_CM_ImCol = postfireImCol.map(maskS2sr);
} else {
  var prefire_CM_ImCol = prefireImCol.map(maskL8sr);
  var postfire_CM_ImCol = postfireImCol.map(maskL8sr);
}

//---------------- Mosaico y recorte de imágenes para el área de estudio --------------------

// Esto es especialmente importante si las colecciones creadas anteriormente contienen más de
// una imagen (si es solo una, el mosaico () no afecta a las imágenes).

var pre_mos = prefireImCol.mosaic().clip(area);
var post_mos = postfireImCol.mosaic().clip(area);

var pre_cm_mos = prefire_CM_ImCol.mosaic().clip(area);
var post_cm_mos = postfire_CM_ImCol.mosaic().clip(area);

// Agregue las imágenes recortadas a la consola de la derecha
print("Imagen en color verdadero previa al Terremoto: ", pre_mos);
print("Imagen en color verdadero posterior al Terremoto: ", post_mos);

//------------ Calcular el ISD para imágenes previas y posteriores al incendio --------------

// Aplicar a la plataforma específica el NBR = (NIR-SWIR2) / (NIR+SWIR2)
if (platform == 'S2' | platform == 's2') {
  var preNBR = pre_cm_mos.expression(
    '2.5 * ((SWIR + RED)-(NIR + BLUE)) / ((SWIR + RED)+(NIR + BLUE))', {

      'SWIR': pre_cm_mos.select('B11'),
      'NIR': pre_cm_mos.select('B8A'),
      'RED': pre_cm_mos.select('B4'),
      'BLUE': pre_cm_mos.select('B2')
});
  var postNBR = post_cm_mos.expression(
    '2.5 * ((SWIR + RED)-(NIR + BLUE)) / ((SWIR + RED)+(NIR + BLUE))', {

      'SWIR': post_cm_mos.select('B11'),
      'NIR': post_cm_mos.select('B8A'),
      'RED': post_cm_mos.select('B4'),
      'BLUE': post_cm_mos.select('B2')
});
} else {
  var preNBR = pre_cm_mos.normalizedDifference(['B5', 'B7']);
  var postNBR = post_cm_mos.normalizedDifference(['B5', 'B7']);
}

// Agregua las imágenes NBR a la consola a la derecha
// Imprime ("Índice de Área Quemada previa al fuego:", preNBR);
// Imprime ("Índice de Área Quemada posterior al incendio:", postNBR);

//---------- Calcular la diferencia entre imágenes previas y posteriores al incendio --------

// El resultado se llama diferencial NBR o dNBR
var dNBR_unscaled = preNBR.subtract(postNBR);

// Escale el producto a los estándares del USGS (FIREMON)
var dNBR = dNBR_unscaled.multiply(1000);

// Agregue la imagen del dNBR a la consola de la derecha
print("Índice diferencial de área quemada: ", dNBR);


//==========================================================================================
//                                 AGREGAR CAPAS AL MAPA

// Añadir el límite.
Map.addLayer(area.draw({color: 'ffffff', strokeWidth: 5}), {},'Área de estudio');

//----------------------------- Imágenes en color verdadero --------------------------------

// Aplicar parámetros de visualización específicos de la plataforma para imágenes en color
// verdadero.
if (platform == 'S2' | platform == 's2') {
  var vis = {bands: ['B4', 'B3', 'B2'], max: 2000, gamma: 1.5};
} else {
  var vis = {bands: ['B4', 'B3', 'B2'], min: 0, max: 4000, gamma: 1.5};
}

// Agregua las imágenes en color verdadero al mapa.
Map.addLayer(pre_mos, vis,'Imagen previa al Terremoto');
Map.addLayer(post_mos, vis,'Imagen posterior al Terremoto');

// Agregua las imágenes en color verdadero al mapa.
Map.addLayer(pre_cm_mos, vis,'Imagen previa al Terremoto: con mascara de nubes');
Map.addLayer(post_cm_mos, vis,'Imagen posterior al Terremoto: con mascara de nubes');

//------------------- Producto de area quemada - En Seudocolor ------------------------

var seudo = ['00FF00', 'FF0000'];

// Elimine los símbolos de comentario (//) a continuación para mostrar antes de la visualización
// el NBR previo y posterior por separado.
Map.addLayer(preNBR, {min: -1, max: 1, palette: seudo}, 'Pre ISD');
Map.addLayer(postNBR, {min: -1, max: 1, palette: seudo}, 'Pos ISD');

var B3 = pre_cm_mos.select(['B3']);
var seudo2 = ['0b0902', 'ffffff'];
Map.addLayer(B3, {min: 0, max: 4000, palette: seudo2}, 'B3');

//Map.addLayer(dNBR, {min: -1000, max: 1000, palette: seudo}, 'dISD en Seudocolor');

//===============================COMPOSICION RGB SDI=======================================
//-------------------------------------- fecha 1----------------------
// Create a constant image.
var image1 = ee.Image(preNBR);
print(image1);
// Select and (optionally) rename bands.
var renamed = image1.select(
    ['constant'], // old names
    ['ISD'] // new names
);

//==========
var rename_nor = renamed.multiply(10000)

// Create a multi-band image from a list of constants.
var multiband = ee.Image([rename_nor, pre_cm_mos]);

//=============
var vis_ISD = {
  min: 0,
  max: 3000,
  bands: ['ISD', 'B3', 'B2'],
  gama: 30
};

Map.addLayer(multiband, vis_ISD, 'ISD T1');
//--------------------------------------fecha 2----------------------
// Create a constant image.
var image2 = ee.Image(postNBR);

// Select and (optionally) rename bands.
var renamed2 = image2.select(
    ['constant'], // old names
    ['ISD2'] // new names
);
//==========
var rename_nor2 = renamed2.multiply(10000)

// Create a multi-band image from a list of constants.
var multiband2 = ee.Image([rename_nor2, post_cm_mos]);

var multibandT = ee.Image([rename_nor2,multiband])

//================================
var vis_ISD2 = {
  min: -1000,
  max: 3000,
  bands: ['ISD2', 'B3', 'B2'],
};
Map.addLayer(multiband2, vis_ISD2, 'ISD T2');
//--------------------------------------COMPOSICION TEMPORAL DEL ISD---------------------
var vis_ISD3 = {
  min: -1000,
  max: 3000,
  bands: ['ISD', 'B3', 'ISD2'],
};
Map.addLayer(multibandT, vis_ISD3, 'ISDT');
//---------------------Center the map and display landslides the image----------------
//Map.setCenter(-96.22055, 16.05913, 15);//derrumbe1
//Map.setCenter(-96.44673, 16.42626, 15);//derrumbe2
//Map.setCenter(-96.30603, 16.51669, 15);//derrumbe3
//Map.setCenter(-96.33929, 16.51671, 15);//derrumbe4
//==========================================================================================
//                                    AGREGAR UNA LEYENDA
// establece la posición del recuadro de leyenda.
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }});
 
// Crea un título de leyenda.
var legendTitle = ui.Label({
  value: 'Índice de deslizamientos EVI-LS',
  style: {fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }});
 // Agregua el título al recuadro.
legend.add(legendTitle);
 
// Crea y estiliza 1 fila de la leyenda.
var makeRow = function(color, name) {
 
      // Crea la etiqueta que en realidad es el cuadro de color.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Usa (padding) para rellenoar y dar la altura y el ancho de la caja.
          padding: '8px',
          margin: '0 0 4px 0'
        }});
 
      // Crea la etiqueta llena con el texto descriptivo.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      // devuelve el panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      })};
 //  Paleta de colores
 var palette =['2944ff', 'ff1616', 'ff78eb', '00ffff'];
 // Nombre de la leyenda
var names = ['Derrumbe o deslizamiento ','Suelo Descubierto o con poca vegetación','Zonas urbanas, suelo desnudo','Nubes y sombras'];
 
// Agregua color y nombres
for (var i = 0; i < 4; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
 // Agrega la leyenda al mapa (también se puede imprimir la leyenda en la consola)
Map.add(legend);
/////////////////////////////////////////////////////////////////////////
var ima = ee.Image('users/aariza/capa_norma');
print(ima);

//================================
var vis_ISD4 = {
  min: 0,
  max: 2,
  bands: ['b1'],
};

Map.addLayer(ima, vis_ISD4, 'Capa Norma');
//==========================================================================================
//                                PREPARAR EL ARCHIVO A EXPORTAR


     
Export.image.toDrive({image: multibandT.select ("ISD", "ISD2"), description: 'ISDT_OXT',
  scale: 10,
  region: area });
Export.image.toDrive({image: pre_cm_mos.select ("B3"), description: 'B3_OXT',
  scale: 10,
  region: area });

// Las descargas estarán disponibles a la derecha en la pestaña de tareas o (Tasks).
//Fin

//==========================================================================================
/////////////////////////////////////////////////////////////////////////
var ima = ee.Image('users/aariza/test1');
print(ima);

//================================
var vis_ISD4 = {
  min: 0,
  max: 2,
  bands: ['b1'],
};

Map.addLayer(ima, vis_ISD4, 'Capa Alex');
//=========END
