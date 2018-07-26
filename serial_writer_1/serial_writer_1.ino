void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
}

void loop() {

  int randWait = random(1, 2);
  
  String dish_0 = "<text>2 Porter 200;</text>";
  String dish_1 = "<text>3 Nasi;</text>";
  String dish_2 = "<text>Chips;</text>";
  String dish_3 = "<text>2 Salmon;</text>";
  String dish_4 = "<text>Bruschetta;</text>";
  String dish_5 = "<text>3 Kids Fish;</text>";

  String dishes[] = {dish_0, dish_1, dish_2, dish_3, dish_4, dish_5};

  int randOrderSize = random(2,4);
  String docket_meals;
  for (int i = 0; i< randOrderSize; i++) {
    docket_meals += dishes[random(0,6)];
  }

  Serial.print(docket_meals);


 

  
  String docket_start = "<epos-print xmlns='http://www.epson-pos.com/schemas/2011/03/epos-print'><text lang='en'/><text smooth='true'/><text font='font_a'/><text width='3' height='3'/>";
  String docket_end = "<cut type='feed'/></epos-print>";
  String printJobId = "ABC123";
  
  String soap = "<s:Header><parameter xmlns='http://www.epson-pos.com/schemas/2011/03/epos-print'><printjobid>";
  soap += printJobId;
  soap += "</printjobid></parameter></s:Header>";
  soap += "<s:Body>";
  soap += docket_start;
  soap += docket_meals;
  soap += docket_end;
  soap += "</s:Body></s:Envelope>";
  
  // put your main code here, to run repeatedly:
  Serial.println(soap);
  //delay(randWait * 1);
}
