import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';

@Injectable()
export class PentahoDashboardService {

  static readonly PENTAHO_HOME_URI = "/pentaho/Home";
  static readonly PENTAHO_LOGOUT_URI = "/pentaho/Logout";
  static readonly PENTAHO_HEADER_BOOTSTRAP_LINK_ID = "pentahoHeaderBootstrap";
  
  private username: string;
  private password: string;

  constructor(
    private http: Http) {
  }

  getUsername(): string {
    return this.username;
  }

  setUsername(username) {
    this.username = username;
  }

  getPassword(): string {
    return this.password;
  }

  setPassword(password) {
    this.password = password;
  }

  isLoggedIn(): boolean {
    return !this.isNotLoggedIn();
  }

  isNotLoggedIn(): boolean {
    return (document.getElementById("pentahoHeaderScript") == null);
  }

  logIn(targetUrl: string) {

    var headers = new Headers();
    headers.append("Authorization", "Basic " + btoa(this.username + ":" + this.password));

    this.http.get(
      PentahoDashboardService.PENTAHO_HOME_URI,
      { headers: headers })
    .subscribe(
      data => {
        if (data.status == 200 && data.url.indexOf(PentahoDashboardService.PENTAHO_HOME_URI) >= 0) {
          if (targetUrl != null) {
            window.location.href = targetUrl;
          }
        }
      },
      error => {
        console.log(error);
      }
    );

  }

  logOut(targetUrl: string) {

    this.http.get(
      PentahoDashboardService.PENTAHO_LOGOUT_URI)
    .subscribe(
      data => {
        if (targetUrl != null) {
          window.location.href = targetUrl;
        }
      },
      error => { 
        console.log(error);
      }
    );

  }

  addHeaderLinks() {

    // Script tag is not rendered in an Angular application, so it is dynamicallly added to the DOM (not a best practice).
    if (document.getElementById(PentahoDashboardService.PENTAHO_HEADER_BOOTSTRAP_LINK_ID) == null) {

      var headerLinkElement = document.createElement("link");
      headerLinkElement.id = PentahoDashboardService.PENTAHO_HEADER_BOOTSTRAP_LINK_ID;
      headerLinkElement.rel = "stylesheet";
      headerLinkElement.type = "text/css";
      headerLinkElement.href = "http://maxcdn.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css";

      document.head.appendChild(headerLinkElement);
    }

  }

  renderDashboard(path: string, htmlId:string) {

    var dashboardScriptElement = this.createDashboardScriptElement();

    var jsCode = "";
    jsCode += this.getJsCodeRequireStart([path]);
    jsCode += this.getJsCodeForSimpleDashboard(htmlId);
    jsCode += this.getJsCodeRequireEnd();

    dashboardScriptElement.innerHTML = jsCode;
    document.getElementById(htmlId).appendChild(dashboardScriptElement);
  }

  renderDashboardDependingOnDashboard(
    path: string,
    htmlId:string,
    params: string[],
    masterDashboardHtmlId: string,
    masterParams: string[]) {

    var masterDashboardPath = document.getElementById(masterDashboardHtmlId).getAttribute("pentahoPath");

    var dashboardScriptElement = this.createDashboardScriptElement();

    var jsCode = "";
    jsCode += this.getJsCodeRequireStart([masterDashboardPath, path]);
    jsCode += this.getJsCodeForDashboardDependingOnDashboard(htmlId, params, masterDashboardHtmlId, masterParams);
    jsCode += this.getJsCodeRequireEnd();

    dashboardScriptElement.innerHTML = jsCode;
    document.getElementById(htmlId).appendChild(dashboardScriptElement);
  }

  renderDashboardDependingOnHtmlElement(
    path: string,
    htmlId:string,
    params: string[],
    masterHtmlElementIds: string[],
    masterHtmlButtonId: string,
    setDefaults: boolean) {

    var dashboardScriptElement = this.createDashboardScriptElement();

    var jsCode = "";
    jsCode += this.getJsCodeRequireStart([path]);
    jsCode += this.getJsCodeForDashboardDependingOnHtmlElement(htmlId, params, masterHtmlElementIds, masterHtmlButtonId, setDefaults);
    jsCode += this.getJsCodeRequireEnd();

    dashboardScriptElement.innerHTML = jsCode;
    document.getElementById(htmlId).appendChild(dashboardScriptElement);
  }

  private createDashboardScriptElement():HTMLScriptElement {
    var dashboardScriptElement = document.createElement("script");
    dashboardScriptElement.type = "text/javascript";
    return dashboardScriptElement;
  }

  private getJsCodeRequireStart(paths: string[]):string {
    var result = "require([";
    for (var i in paths) {
      result += "\"dash!" + paths[i] + "\",";
    }
    result = result.substring(0, result.length - 1);
    result += "] ";
    return result;
  }

  private getJsCodeRequireEnd():string {
    return "); ";
  }

  private getJsCodeForSimpleDashboard(htmlId:string):string {
    return ", function(Dashboard) { var currentDashboard = new Dashboard(\"" + htmlId + "\"); currentDashboard.render(); }";
  }

  private getJsCodeForDashboardDependingOnDashboard(
    htmlId:string,
    params: string[],
    masterDashboardHtmlId:string,
    masterParams: string[]):string {

    var jsCode = ", function(MasterDashboard, Dashboard) { ";

    jsCode += "var currentDashboard = new Dashboard(\"" + htmlId + "\"); ";
    jsCode += "currentDashboard.render(); ";

    jsCode += "var masterDashboard = new MasterDashboard(\"" + masterDashboardHtmlId + "\"); ";
    jsCode += "masterDashboard.render(); ";

    for (let i in masterParams) {
      jsCode += "masterDashboard.on(\"cdf " + masterParams[i] + ":fireChange\", function (evt) { currentDashboard.fireChange(\"" + params[i] + "\", evt.value); }); ";
    }

    jsCode += "} ";
    
    return jsCode;
  }

  private getJsCodeForDashboardDependingOnHtmlElement(
    htmlId:string,
    params: string[],
    masterHtmlElementIds: string[],
    masterHtmlButtonId: string,
    setDefaults: boolean):string {

    var jsCode = ", function(Dashboard) { ";

    jsCode += "var currentDashboard = new Dashboard(\"" + htmlId + "\"); ";
    jsCode += "currentDashboard.render(); ";

    if (masterHtmlButtonId == null) {

      for (let i in masterHtmlElementIds) {
        jsCode += "var htmlElement" + i + " = document.getElementById(\"" + masterHtmlElementIds[i] + "\"); ";
        jsCode += "htmlElement" + i + ".addEventListener(\"change\", function() { currentDashboard.fireChange(\"" + params[i] + "\", this.value); }); ";
        if (setDefaults) {
          jsCode += "currentDashboard.setParameter(\"" + params[i] + "\", htmlElement"+ i +".value); ";
        }
      }

    }
    else {

      jsCode += "var buttonObj = document.getElementById(\"" + masterHtmlButtonId + "\"); ";

      jsCode += "buttonObj.addEventListener(\"click\", function() { ";
      for (let i in masterHtmlElementIds) {
        jsCode += "currentDashboard.fireChange(\"" + params[i] + "\", document.getElementById(\"" + masterHtmlElementIds[i] + "\").value); ";
      }
      jsCode += " }); ";

    }

    jsCode += "} ";

    return jsCode;
  }
}
