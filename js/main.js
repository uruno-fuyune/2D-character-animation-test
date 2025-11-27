window.onload = function () {

  paper.setup("myCanvas");


  // 変数宣言 //

  const faceRotate = { x: 0, y: 0, z: 0 };
  let em = 0;

  let preX = 0;
  let preY = 0;
  let preZ = 0;
  let preK = 0;
  let preA = false;

  let eyescale = 0.2

  let blinktime = 0;
  let nextblink = Math.random() * 10;
  let bp = 0;
  let isb = false;
  



  //図形操作用クラス、パーツ毎でいちいち冗長すぎる？//

  class parts {
    constructor(data) {
      this.source = data.clone();
      this.state = data;

      this.state.applyMatrix = false;
      this.source.visible = false;
      //this.state.visible = false;
      //this.state.fullySelected = true;
    }

    pathinitialize() {

      this.state.position.x = this.source.position.x;
      this.state.position.y = this.source.position.y;

      if (this.source.segments) {

        for (let i = 0; i < this.source.segments.length; i++) {

          this.state.segments[i].point = this.source.segments[i].point.clone();

          if (this.source.segments[i].handleIn && !this.source.segments[i].handleIn.isZero()) {

            this.state.segments[i].handleIn = this.source.segments[i].handleIn.clone();

          }

          if (this.source.segments[i].handleOut && !this.source.segments[i].handleOut.isZero()) {

            this.state.segments[i].handleOut = this.source.segments[i].handleOut.clone();

          }

        };
      }
    }



    moveXY(dx, dy, moveX, moveY) {

      this.state.bounds.topCenter.x += dx * moveX;
      this.state.bounds.topCenter.y -= dy * moveY;
    }

    rotateZ(dz, rotate) {
      this.state.rotation = dz * rotate;
    }

    scaleXY(dx, dy, scaleX, scaleY) {

      const src = this.state.clone();

      for (let i = 0; i < this.state.segments.length; i++) {

        const relative = src.segments[i].point.subtract(this.source.bounds.center);
        const scaled = new paper.Point(
          relative.x * (1 / (1 + (dx * scaleX))),
          relative.y * (1 / (1 + (dy * scaleY)))
        );
        this.state.segments[i].point = this.source.bounds.center.add(scaled);

        if (src.segments[i].handleIn && !src.segments[i].handleIn.isZero()) {
          this.state.segments[i].handleIn = src.segments[i].handleIn.multiply(new paper.Point(
            (1 / (1 + (dx * scaleX))),
            (1 / (1 + (dy * scaleY)))
          ));
        }

        if (src.segments[i].handleOut && !src.segments[i].handleOut.isZero()) {
          this.state.segments[i].handleOut = src.segments[i].handleOut.multiply(new paper.Point(
            (1 / (1 + (dx * scaleX))),
            (1 / (1 + (dy * scaleY)))
          ));
        }
      }

      src.remove();

      //this.state.scaling = new paper.Point((1 / (1 + (Math.abs(dx) * scaleX))), (1 / (1 + (Math.abs(dy) * scaleY))));
    }

    gScale(dx, dy, scaleX, scaleY) {

      this.state.scaling = new paper.Point((1 / (1 + (dx * scaleX))), (1 / (1 + (dy * scaleY))));
    }

    shearXY(dx, dy, shearX, shearY) {

      const src = this.state.clone();

      for (let i = 0; i < this.state.segments.length; i++) {
        const relative = src.segments[i].point.subtract(src.bounds.center);
        const sheared = new paper.Point(
          relative.x + (dx * shearX) * relative.y,
          relative.y - (dy * shearY) * relative.x
        );
        this.state.segments[i].point = src.bounds.center.add(sheared);

        if (src.segments[i].handleIn && !src.segments[i].handleIn.isZero()) {
          this.state.segments[i].handleIn = new paper.Point(
            src.segments[i].handleIn.x + (dx * shearX) * src.segments[i].handleIn.y,
            src.segments[i].handleIn.y - (dy * shearY) * src.segments[i].handleIn.x
          );
        }

        if (src.segments[i].handleOut && !src.segments[i].handleOut.isZero()) {
          this.state.segments[i].handleOut = new paper.Point(
            src.segments[i].handleOut.x + (dx * shearX) * src.segments[i].handleOut.y,
            src.segments[i].handleOut.y - (dy * shearY) * src.segments[i].handleOut.x
          );
        }
      }
      src.remove();
    }

    perspectiveXY(dx, dy, perspectiveX, perspectiveY, nk, value) {


      const src = this.state.clone();
      const sta = this.state;
      const center = src.bounds.center;

      let m = 0;

      if (value > 0) {
        m = value;
      }
      else {
        const w = src.bounds.width, h = src.bounds.height;
        m = Math.max(w, h);
      }

      const factor = (x, y) => nk / (1 + (dx * perspectiveX) * (x / m) + (-dy * perspectiveY) * (y / m));

      for (let i = 0; i < src.segments.length; i++) {
        const seg = src.segments[i];
        const rel = seg.point.subtract(center);
        const f = factor(rel.x, rel.y);
        sta.segments[i].point = center.add(rel.multiply(f));

        if (seg.handleIn && !seg.handleIn.isZero()) {
          const absHandle = seg.handleIn.add(seg.point);
          const r = absHandle.subtract(center);
          const fh = factor(r.x, r.y);
          const cal = r.multiply(fh);
          sta.segments[i].handleIn = center.add(cal).subtract(sta.segments[i].point);
        }

        if (seg.handleOut && !seg.handleOut.isZero()) {
          const absHandle = seg.handleOut.add(seg.point);
          const r = absHandle.subtract(center);
          const fh = factor(r.x, r.y);
          const cal = r.multiply(fh);
          sta.segments[i].handleOut = center.add(cal).subtract(sta.segments[i].point);
        }

      };

      //this.perspectiveScaleXY(dx, dy, nk * perspectiveX * Math.abs(dx), nk * perspectiveY * Math.abs(dy));

      src.remove();

      //this.state.bounds.center = this.source.bounds.center;
    }




    trapezoidalXY(dx, dy, trapezoidalX, trapezoidalY) {

      for (let i = 0; i < this.state.segments.length; i++) {

        let relative = this.source.segments[i].point.subtract(this.source.bounds.center);
        let normalX = this.source.segments[i].point.x - this.source.bounds.x;
        let normalY = this.source.segments[i].point.y - this.source.bounds.y;
        let trapezoidal = new paper.Point(
          relative.x - (relative.x * dx * (normalY)) / this.source.bounds.height,
          relative.y - (relative.y * dy * (normalX)) / this.source.bounds.width
        );
        this.state.segments[i].point = this.source.bounds.center.add(trapezoidal);


        if (this.source.segments[i].handleIn && !this.source.segments[i].handleIn.isZero()) {

          let abs = this.source.segments[i].handleIn.add(this.source.segments[i].point);
          relative = abs.subtract(this.source.bounds.center);
          normalX = abs.x - this.source.bounds.x;
          normalY = abs.y - this.source.bounds.y;
          trapezoidal = new paper.Point(
            relative.x - (relative.x * dx * (normalY)) / this.source.bounds.height,
            relative.y - (relative.y * dy * (normalX)) / this.source.bounds.width
          );
          this.state.segments[i].handleIn = this.source.bounds.center.add(trapezoidal).subtract(this.state.segments[i].point);
        }

        if (this.source.segments[i].handleOut && !this.source.segments[i].handleOut.isZero()) {
          let abs = this.source.segments[i].handleOut.add(this.source.segments[i].point);
          relative = abs.subtract(this.source.bounds.center);
          normalX = abs.x - this.source.bounds.x;
          normalY = abs.y - this.source.bounds.y;
          trapezoidal = new paper.Point(
            relative.x - (relative.x * dx * (normalY)) / this.source.bounds.height,
            relative.y - (relative.y * dy * (normalX)) / this.source.bounds.width
          );
          this.state.segments[i].handleOut = this.source.bounds.center.add(trapezoidal).subtract(this.state.segments[i].point);
        }


      }
      //this.state.bounds.width = this.source.bounds.width;
      //this.state.bounds.height = this.source.bounds.height;
      this.state.bounds.center = this.source.bounds.center;
    }

  }



  //斜め方向の強さを計算する関数//

  function diagonalstrength(dx, dy) {

    if (dx === 0 && dy === 0) {
      return 0;
    }
    let magnitude = Math.sqrt(dx * dx + dy * dy);
    let d = (dy / magnitude) * (dx / magnitude);
    let diagonal = d * magnitude * magnitude;
    return diagonal;
  }

  //左右非対称に倍率をかける関数、あまり動きは美しくないのでパーツの初期位置から変えるべき、目の動きには使うかな//

  function asymmetry(d, posi, nega) {
    if (d > 0) {
      return d * posi;
    }

    else if (d < 0) {
      return d * nega;
    }
    else {
      return 0;
    }
  }










  // SVG読み込み、この関数の中にフレーム処理を書かないと動かない、読み込み待つ方法ほかにない？//

  paper.project.importSVG("svg/test.svg", function (item) {




    console.log(item);
    //console.log(item.clipped);
    //なぜクリップされてる？動くと見切れるので解除//
    item.clipped = false;

    //読み込むとファイルごとグループされるので中身を取り出す//
    //読み込むイラレで書いたSVGはレイヤーのグループタグが付いているので用意するときに削除している//

    const chara = item.children["test"];
    chara.bounds.center = paper.view.center;

    //console.log(chara.clipped);

    const head = chara.children["head"];
    const back = chara.children["back"];

    const face = head.children["face"];
    const bangs = head.children["bangs"];

    //数字で指定しているのは名前で呼び出せなかったため、グループが別でも名前がかぶるとダメ？//
    const fch = bangs.children[6];
    const flh1 = bangs.children["left1"];
    const flh2 = bangs.children["left2"];
    const flh3 = bangs.children["left3"];
    const frh1 = bangs.children["right1"];
    const frh2 = bangs.children["right2"];
    const frh3 = bangs.children["right3"];

    const bch = back.children[0];
    const blh = back.children["left"];
    const brh = back.children["right"];
    const bch2 = back.children["center2"];

    const eyel = head.children["lefteye"];
    const eyer = head.children["righteye"];

    const lel1 = eyel.children[3];
    const lel2 = eyel.children[2];
    const lel3 = eyel.children[1];
    const leli = eyel.children[0];

    const rel1 = eyer.children[3];
    const rel2 = eyer.children[2];
    const rel3 = eyer.children[1];
    const reli = eyer.children[0];

    const lelb = leli.children[1];
    const lelw = leli.children[0];

    const relb = reli.children[1];
    const relw = reli.children[0];



    const lb = head.children["leftbrow"];
    const rb = head.children["rightbrow"];

    const nose = head.children["nose"];

    const nosew = nose.children[1];
    const noseb = nose.children[0];

    const mouth = head.children["mouth"];

    //eyel.visible= false;
    //eyer.visible= false;


    //キャラの幅と高さと中心、汎用するデータ//
    let weght = chara.bounds.weght;
    let height = chara.bounds.height;
    let center = chara.bounds.center.clone();

    const neck = new paper.Point(paper.view.center.x, paper.view.size.height*5.2/10);
    //const backpivot = new paper.Point(paper.view.center.x, 100);
    const bodyp = new paper.Point(paper.view.center.x, paper.view.size.height*1/10);

    head.pivot = neck;
    back.pivot = neck;
    chara.pivot = bodyp;

    lelw.clipMask = true;
    relw.clipMask = true;

    //lelw.fullySelected = true;
    //relw.fullySelected = true;



    const charaparts = new parts(chara);
    const headparts = new parts(head);
    const backparts = new parts(back);

    const faceparts = new parts(face);

    const bangsparts = new parts(bangs);


    const fchparts = new parts(fch);
    const flh1parts = new parts(flh1);
    const flh2parts = new parts(flh2);
    const flh3parts = new parts(flh3);
    const frh1parts = new parts(frh1);
    const frh2parts = new parts(frh2);
    const frh3parts = new parts(frh3);

    const bchparts = new parts(bch);
    const blhparts = new parts(blh);
    const brhparts = new parts(brh);
    const bch2parts = new parts(bch2);

    const eyelparts = new parts(eyel);
    const eyerparts = new parts(eyer);

    const lel1parts = new parts(lel1);
    const lel2parts = new parts(lel2);
    const lel3parts = new parts(lel3);

    const rel1parts = new parts(rel1);
    const rel2parts = new parts(rel2);
    const rel3parts = new parts(rel3);

    const lbparts = new parts(lb);
    const rbparts = new parts(rb);

    const lelwparts = new parts(lelw);
    const relwparts = new parts(relw);

    const lelbparts = new parts(lelb);
    const relbparts = new parts(relb);

    const nosewparts = new parts(nosew);
    const nosebparts = new parts(noseb);


    const mouthparts = new parts(mouth);




    /*
    var neckpoint = new paper.Path.Circle({
      center: neck,
      radius: 10,
      fillColor: 'black'
    });
    var bodypoint = new paper.Path.Circle({
      center: bodyp,
      radius: 10,
      fillColor: 'black'
    });

    chara.addChild(neckpoint);
    */


    //faceparts.state.fullySelected = true;



    

    

    let viewsize = paper.view.size.clone();
    let previewsize = paper.view.size.height/viewsize.height;

    chara.scale(viewsize.height/chara.bounds.height);


    function initialize() {
      let scale = paper.view.size.height/viewsize.height;

      chara.scale(scale/previewsize);
      
      chara.bounds.bottomCenter = new paper.Point(paper.view.center.x,paper.view.size.height+(paper.view.size.height*1/10));
      
      previewsize = scale;
    }



    initialize();


    function hairs() {

      fchparts.pathinitialize();
      fchparts.perspectiveXY(faceRotate.y, faceRotate.x, 0.2, 0.1, 1, weght);
      fchparts.scaleXY(Math.abs(faceRotate.y), faceRotate.x, 0.03, 0.05);
      fchparts.moveXY(faceRotate.y, faceRotate.x, 45, 40);

      flh1parts.pathinitialize();
      flh1parts.perspectiveXY(-faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      flh1parts.scaleXY(faceRotate.y, faceRotate.x, 0.05, 0.05)
      flh1parts.moveXY(faceRotate.y, faceRotate.x, 35, 35);

      frh1parts.pathinitialize();
      frh1parts.perspectiveXY(-faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      frh1parts.scaleXY(-faceRotate.y, faceRotate.x, 0.05, 0.05)
      frh1parts.moveXY(faceRotate.y, faceRotate.x, 35, 35);

      flh2parts.pathinitialize();
      flh2parts.perspectiveXY(-faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      flh2parts.scaleXY(faceRotate.y, faceRotate.x, 0.05, 0.05);
      flh2parts.moveXY(faceRotate.y, faceRotate.x, 25, 30);

      frh2parts.pathinitialize();
      frh2parts.perspectiveXY(-faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      frh2parts.scaleXY(-faceRotate.y, faceRotate.x, 0.05, 0.05)
      frh2parts.moveXY(faceRotate.y, faceRotate.x, 25, 30);

      flh3parts.pathinitialize();
      flh3parts.perspectiveXY(-faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      flh3parts.scaleXY(faceRotate.y, faceRotate.x, 0.05, 0.05);
      flh3parts.moveXY(faceRotate.y, faceRotate.x, 20, 20);

      frh3parts.pathinitialize();
      frh3parts.perspectiveXY(-faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      frh3parts.scaleXY(-faceRotate.y, faceRotate.x, 0.05, 0.05);
      frh3parts.moveXY(faceRotate.y, faceRotate.x, 20, 20);

      bchparts.pathinitialize();
      bchparts.perspectiveXY(faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      bchparts.scaleXY(Math.abs(faceRotate.y), -faceRotate.x, 0.05, 0.1);
      bchparts.moveXY(-faceRotate.y, -faceRotate.x, 20, 10);

      bch2parts.pathinitialize();
      bch2parts.perspectiveXY(faceRotate.y, faceRotate.x, 0.05, 0.05, 1, weght);
      bch2parts.scaleXY(-Math.abs(faceRotate.y), -faceRotate.x, 0.01, 0.01);
      bch2parts.moveXY(-faceRotate.y, faceRotate.x, 5, 5);

      blhparts.pathinitialize();
      blhparts.perspectiveXY(faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      blhparts.scaleXY(faceRotate.y, -faceRotate.x, 0.05, 0);
      blhparts.moveXY(faceRotate.y, faceRotate.x, 15, 25);

      brhparts.pathinitialize();
      brhparts.perspectiveXY(faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      brhparts.scaleXY(-faceRotate.y, -faceRotate.x, 0.05, 0);
      brhparts.moveXY(faceRotate.y, faceRotate.x, 15, 25);

    }

    function eyes() {

      lel1parts.pathinitialize();
      lel1parts.shearXY(0, -faceRotate.x, 1, eyescale);
      //lel1parts.scaleXY(0,em,1,0.3);
      //lel1parts.moveXY(0, -em, 1, 45)
      //lel1parts.perspectiveXY(faceRotate.y, faceRotate.x, 0.2, 0.1, 1, weght);
      //lel1parts.scaleXY(faceRotate.y, faceRotate.x, 0.3, 0.05);

      rel1parts.pathinitialize();
      rel1parts.shearXY(0, faceRotate.x, 1, eyescale);
      //rel1parts.scaleXY(0,em,1,0.3);
      //rel1parts.moveXY(0, -em, 1, 45)
      //rel1parts.perspectiveXY(faceRotate.y, faceRotate.x, 0.2, 0.1, 1, weght);
      //rel1parts.scaleXY(-faceRotate.y, faceRotate.x, 0.3, 0.05);

      lel2parts.pathinitialize();
      lel2parts.shearXY(0, -faceRotate.x, 1, eyescale);
      //lel2parts.scaleXY(0, em, 1, 0.9);
      //lel2parts.moveXY(0, asymmetry(faceRotate.x, 0, 10), 1, 1)
      //lel2parts.perspectiveXY(faceRotate.y, faceRotate.x, 0.2, 0.1, 1, weght);
      //lel2parts.scaleXY(0, asymmetry(faceRotate.x,0,0.2), 0.3, 1);

      rel2parts.pathinitialize();
      rel2parts.shearXY(0, faceRotate.x, 1, eyescale);
      //rel2parts.scaleXY(0, em, 1, 0.9);
      //rel2parts.moveXY(0, asymmetry(faceRotate.x, 0, 10), 1, 1)
      //rel2parts.perspectiveXY(faceRotate.y, faceRotate.x, 0.2, 0.1, 1, weght);
      //rel2parts.scaleXY(-faceRotate.y, faceRotate.x, 0.3, 0.05);

      lel3parts.pathinitialize();
      lel3parts.shearXY(0, -faceRotate.x, 1, eyescale);
      //lel3parts.moveXY(0,em,1,30)
      //lel3parts.perspectiveXY(faceRotate.y, faceRotate.x, 0.2, 0.1, 1, weght);
      //lel3parts.scaleXY(faceRotate.y, faceRotate.x, 0.3, 0.05);

      rel3parts.pathinitialize();
      rel3parts.shearXY(0, faceRotate.x, 1, eyescale);
      //rel3parts.perspectiveXY(faceRotate.y, faceRotate.x, 0.2, 0.1, 1, weght);
      //rel3parts.scaleXY(-faceRotate.y, faceRotate.x, 0.3, 0.05);

      


      lelwparts.pathinitialize();
      lelwparts.shearXY(0, -faceRotate.x, 1, eyescale * 0.95+em*0.3);
      //lelwparts.scaleXY(0, Math.abs(faceRotate.x), 1, 0.10);
      //lelwparts.moveXY(0, asymmetry(faceRotate.x, 5, 0), 1, 1)

      relwparts.pathinitialize();
      relwparts.shearXY(0, faceRotate.x, 1, eyescale * 0.95+em*0.3);
      //relwparts.scaleXY(0, Math.abs(faceRotate.x), 1, 0.10);
      //relwparts.moveXY(0, asymmetry(faceRotate.x, 5, 0), 1, 1)

      lelbparts.pathinitialize();
      lelbparts.shearXY(0, -faceRotate.x, 1, eyescale);
      lelbparts.moveXY((Rk-faceRotate.y*0.3 + 0.1),(Rk2-faceRotate.x*0.5 - 0.1), 35*-(asymmetry(faceRotate.y,0.3,0.1)-1), 35*(Math.abs(asymmetry(faceRotate.x,0.1,0.1))+1))

      relbparts.pathinitialize();
      relbparts.shearXY(0, faceRotate.x, 1, eyescale);
      relbparts.moveXY((Rk-faceRotate.y*0.3 - 0.1),(Rk2-faceRotate.x*0.5 - 0.1), 35*(asymmetry(faceRotate.y,0.1,0.3)+1), 35*(Math.abs(asymmetry(faceRotate.x,0.1,0.1))+1))


      //eyelparts.pathinitialize();
      //eyelparts.gScale(em * 0.1 + asymmetry(faceRotate.y, 0.4, 0.15), em * 0.9 + (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1)
      //eyelparts.gScale(1, asymmetry(faceRotate.y,0.2,0.1), 1, 1)
      //eyelparts.moveXY(-em * 5 + asymmetry(faceRotate.y, 25, 35), -em * 30 + (asymmetry(faceRotate.x, 30, 30)), 1, 1);
      //eyelparts.state.scale((1 / (1 + (faceRotate.y * 1))),(1 / (1 + (faceRotate.x * 1))));

      //eyerparts.pathinitialize();
      //eyerparts.gScale(em * 0.1 - asymmetry(faceRotate.y, 0.15, 0.4), em * 0.9 + (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1)
      //eyerparts.moveXY(em * 5 + asymmetry(faceRotate.y, 35, 25), -em * 30 + (asymmetry(faceRotate.x, 30, 30)), 1, 1);
      //eyerparts.state,scale((1 / (1 + (-faceRotate.y * 1))),(1 / (1 + (faceRotate.x * 1))));

      
      




      lel1parts.scaleXY(asymmetry(faceRotate.y, 0.5, 0.15), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      lel2parts.scaleXY(-asymmetry(faceRotate.y, 0.3, 0.1), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      lel3parts.scaleXY(asymmetry(faceRotate.y, 0.8, 0.1), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      lelwparts.scaleXY(asymmetry(faceRotate.y, 0.7, 0.15), (Math.abs(asymmetry(faceRotate.x, 0.01, 0.01))), 1, 1);
      lelbparts.scaleXY(asymmetry(faceRotate.y, 0.4, 0.15), (Math.abs(asymmetry(faceRotate.x, 0.0, 0.0))), 1, 1);

      lel1parts.moveXY(asymmetry(faceRotate.y, 25, 35), (asymmetry(faceRotate.x, 30, 30)), 1, 1);
      lel2parts.moveXY(asymmetry(faceRotate.y, 15, 25), (asymmetry(faceRotate.x, 30, 20)), 1, 1);
      lel3parts.moveXY(asymmetry(faceRotate.y, 25, 35),(asymmetry(faceRotate.x, 35, 25)), 1, 1);
      lelwparts.moveXY(asymmetry(faceRotate.y, 25, 35), (asymmetry(faceRotate.x, 38, 28)), 1, 1);
      lelbparts.moveXY(asymmetry(faceRotate.y, 30, 40), (asymmetry(faceRotate.x, 40, 30)), 1, 1);

      

      rel1parts.scaleXY(-asymmetry(faceRotate.y, 0.15, 0.5), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      rel2parts.scaleXY(asymmetry(faceRotate.y, 0.1, 0.3), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      rel3parts.scaleXY(-asymmetry(faceRotate.y, 0.1, 0.8), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      relwparts.scaleXY(-asymmetry(faceRotate.y, 0.15, 0.7), (Math.abs(asymmetry(faceRotate.x, 0.01, 0.01))), 1, 1);
      relbparts.scaleXY(-asymmetry(faceRotate.y, 0.15, 0.4), (Math.abs(asymmetry(faceRotate.x, 0.0, 0.0))), 1, 1);

      rel1parts.moveXY(asymmetry(faceRotate.y, 35, 25), (asymmetry(faceRotate.x, 30, 30)), 1, 1);
      rel2parts.moveXY(asymmetry(faceRotate.y, 25, 15), (asymmetry(faceRotate.x, 30, 20)), 1, 1);
      rel3parts.moveXY(asymmetry(faceRotate.y, 35, 25), (asymmetry(faceRotate.x, 35, 25)), 1, 1);
      relwparts.moveXY(asymmetry(faceRotate.y, 35, 25), (asymmetry(faceRotate.x, 38, 28)), 1, 1);
      relbparts.moveXY(asymmetry(faceRotate.y, 40, 30), (asymmetry(faceRotate.x, 40, 30)), 1, 1);

      

      lel1parts.scaleXY(em * 0.1, em * 0.3, 1, 1);
      lel2parts.scaleXY(em * 0.1, em * 8, 1, 1);
      lel3parts.scaleXY(em * 0.1, em * 0.9, 1, 1);
      lelwparts.scaleXY(em * 0.3, em * em*5, 1, 1);
      lelbparts.scaleXY(em * 0.1, em * 0.9, 1, 1);

      lel1parts.moveXY(-em * 5, -em * 40, 1, 1);
      lel2parts.moveXY(-em * 5, -em * 28, 1, 1);
      //lel3parts.moveXY(-em * 5, -em * 30, 1, 1);
      lelwparts.moveXY(-em * 5, -em * 19, 1, 1);
      lelbparts.moveXY(-em * 5, -em * 30, 1, 1);



      

      rel1parts.scaleXY(em * 0.1, em * 0.3, 1, 1);
      rel2parts.scaleXY(em * 0.1, em * 8, 1, 1);
      rel3parts.scaleXY(em * 0.1, em * 0.9, 1, 1);
      relwparts.scaleXY(em * 0.3, em * em*5, 1, 1);
      relbparts.scaleXY(em * 0.1, em * 0.9, 1, 1);

      rel1parts.moveXY(em * 5, -em * 40, 1, 1);
      rel2parts.moveXY(em * 5, -em * 28, 1, 1);
      //rel3parts.moveXY(em * 5, -em * 30, 1, 1);
      relwparts.moveXY(em * 5, -em * 19, 1, 1);
      relbparts.moveXY(em * 5, -em * 30, 1, 1);

      
      lbparts.pathinitialize();
      lbparts.shearXY(0, -faceRotate.x, 1, eyescale);
      lbparts.scaleXY(asymmetry(faceRotate.y, 0.4, 0.15), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      lbparts.moveXY(asymmetry(faceRotate.y, 25, 35), faceRotate.x, 1, 35)

      rbparts.pathinitialize();
      rbparts.shearXY(0, faceRotate.x, 1, eyescale);
      rbparts.scaleXY(-asymmetry(faceRotate.y, 0.15, 0.4), (Math.abs(asymmetry(faceRotate.x, 0.03, 0.1))), 1, 1);
      rbparts.moveXY(asymmetry(faceRotate.y, 35, 25), faceRotate.x, 1, 35)

    }

    function faces() {

      faceparts.pathinitialize();
      faceparts.perspectiveXY(faceRotate.y, faceRotate.x, 0.1, 0.1, 1, weght);
      faceparts.scaleXY(Math.abs(faceRotate.y), faceRotate.x, 0.05, 0.05);
      faceparts.moveXY(faceRotate.y, faceRotate.x, 20, 10);

      mouthparts.pathinitialize();
      mouthparts.perspectiveXY(faceRotate.y, -faceRotate.x, 0.3, 0.3, 1, weght);
      mouthparts.scaleXY(Math.abs(faceRotate.y), Math.abs(faceRotate.x), 0.35, 0.2)
      mouthparts.moveXY(faceRotate.y, faceRotate.x - 0.1, 35, 30);

      nosebparts.pathinitialize();
      nosebparts.scaleXY(0, Math.abs(faceRotate.y), 0, 0.3);
      nosebparts.moveXY(faceRotate.y, faceRotate.x - 0.5, 56, 41);

      nosewparts.pathinitialize();
      //nosewparts.scaleXY(Math.abs(faceRotate.y),0,0.5,0);
      nosewparts.moveXY(faceRotate.y, faceRotate.x - 0.5, 50, 40);

    }

    


    //フレーム毎の処理、ここに動かすコードを書く//

    paper.view.onFrame = function (event) {



      faceRotate.x = faceRotatein.x + Math.cos(event.time * 1) * 0.5;
      faceRotate.y = faceRotatein.y + Math.cos(event.time * 0.3) * 0.01;
      faceRotate.z = faceRotatein.z + Math.sin(event.time * 0.3) * 0.1;
      //em = emi+(Math.sin(event.time*0.5)/20 + 0.05);

      blinktime += event.delta;
      if (blinktime > nextblink||(pushA&&!preA)) {
        blinktime = 0;
        nextblink = Math.random() * 10;

        bp = 0;
        isb = true;
      }

      

      em = emi;

      if (isb) {
        bp += event.delta * 13;
        em = -(Math.cos(Math.PI * bp)) * (1 - emi) / 2 + (1 + emi) / 2;
        if (bp >= 2) {
          isb = false;
          //em = 0;
        }
      }



      if (preX !== faceRotate.x || preY !== faceRotate.y || preZ !== faceRotate.z || preK !== Rk || preK2 !== Rk2) {

       
        hairs();
        eyes();
        faces();


        charaparts.rotateZ(-faceRotate.z, 0.5);
        headparts.rotateZ(faceRotate.z, 10);
        backparts.rotateZ(faceRotate.z, 10);


        preX = faceRotate.x;
        preY = faceRotate.y;
        preZ = faceRotate.z;
        preK = Rk;
        preK2 = Rk2;


        //console.log("FrameUpdate!");

        //console.log(event.time);


      }


      preA = pushA;


    }


    paper.view.onResize = function (event) {
      initialize();
    }

  });




  paper.view.draw();

};
