//Indice temporal de suelo desnudo, Ver. 1.0
//temporal Barren Soil Script

let BSI = ((B11 + B04)-(B08 + B02))/((B11 + B04)+(B08 + B02))
 
return [ B04, B08, BSI * 6.25];

